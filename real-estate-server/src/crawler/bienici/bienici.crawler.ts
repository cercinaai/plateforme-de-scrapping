import { Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { DataProcessingService } from "../../data-processing/data-processing.service";
import { Job } from "bull";
import { bieniciConfig } from "./../../config/crawler.config";
import { bieniciCrawlerOption } from './../../config/playwright.config';
import { createPlaywrightRouter, Dictionary, FinalStatistics, PlaywrightCrawler, PlaywrightCrawlingContext, RequestQueue, RouterHandler } from "crawlee";
import { Page } from "playwright";
import { HttpService } from "@nestjs/axios";

@Processor('crawler')
export class BieniciCrawler {
    private readonly logger = new Logger(BieniciCrawler.name);
    protected readonly targetUrl = "https://www.bienici.com/recherche/achat/france/maisonvilla,appartement,parking,terrain,loft,commerce,batiment,chateau,local,bureau,hotel,autres?mode=liste&tri=publication-desc";
    private checkDate!: Date;
    constructor(protected readonly dataProcessingService: DataProcessingService, protected readonly httpService: HttpService) { }

    @Process({ name: 'bienici-crawler' })
    async start(job: Job) {
        await this.initialize(job);
        const stats = await this.crawl(job);
        if (job.data['status'] && job.data['status'] === 'failed' || stats.requestsTotal === 0) {
            await this.handleFailure(job, stats);
            return;
        }
        await this.handleSuccess(job, stats);
    }

    protected async crawl(job: Job): Promise<FinalStatistics> {
        const crawler = await this.createCrawler(job);
        const stats = await crawler.run([this.targetUrl]);
        await crawler.requestQueue.drop();
        await crawler.teardown();
        return stats
    }

    protected async initialize(job: Job) {
        this.checkDate = new Date();
        await job.update({
            crawler_origin: 'bienici',
            status: 'running',
            total_data_grabbed: 0,
            attempts_count: 0,
            localite_index: 0,
            list_page: 1,
            LIMIT_REACHED: false,
            // france_localities: [
            //     { link: 'ile-de-france,1_0', limit: 563, data_grabbed: 0 },
            //     { link: 'aquitaine,15_0', limit: 303, data_grabbed: 0 },
            //     { link: 'Auvergne,19_0', limit: 357, data_grabbed: 0 },
            //     { link: 'Bretagne,13_0', limit: 134, data_grabbed: 0 },
            //     { link: 'centre,5_0', limit: 85, data_grabbed: 0 },
            //     { link: 'Bourgogne,7_0', limit: 89, data_grabbed: 0 },
            //     { link: 'corse,22_0', limit: 23, data_grabbed: 0 },
            //     { link: 'franche-comte,11_0', limit: 89, data_grabbed: 0 },
            //     { link: 'basse-normandie,6_0', limit: 52, data_grabbed: 0 },
            //     { link: 'pays-de-la-loire,12_0', limit: 146, data_grabbed: 0 },
            //     { link: 'provence-alpes-cote-d-azur,21_0', limit: 398, data_grabbed: 0 },
            //     { link: 'haute-normandie,4_0', limit: 55, data_grabbed: 0 },
            //     // HAUTS DE FRANCE
            //     { link: 'picardie,3_0', limit: 75, data_grabbed: 0 },
            //     { link: 'nord-pas-de-calais,8_0', limit: 75, data_grabbed: 0 },
            //     // Occitanie
            //     { link: 'midi-pyrenees,16_0', limit: 153, data_grabbed: 0 },
            //     { link: 'languedoc-roussillon,20_0', limit: 153, data_grabbed: 0 },
            //     // GRAND EST
            //     { link: 'champagne-ardenne,2_0', limit: 56, data_grabbed: 0 },
            //     { link: 'lorraine,9_0', limit: 56, data_grabbed: 0 },
            //     { link: 'alsace,10_0', limit: 56, data_grabbed: 0 },
            //     // GUADELOUPE
            //     { link: 'guadeloupe-97,40266_1', limit: 18, data_grabbed: 0 },
            //     // GUYANE
            //     { link: 'guyane-973,40267_1', limit: 5, data_grabbed: 0 },
            //     { link: 'la-reunion-97,40270_1', limit: 24, data_grabbed: 0 },
            //     { link: 'martinique-97,40269_1', limit: 13, data_grabbed: 0 }
            // ]
        })
    }

    protected async createCrawler(job: Job) {
        const request_queue = await RequestQueue.open('bienici-crawler-queue');
        return new PlaywrightCrawler({
            ...bieniciCrawlerOption,
            requestQueue: request_queue,
            requestHandlerTimeoutSecs: 1800,
            preNavigationHooks: [async (context) => await this.preNavigationHook(context, job)],
            errorHandler: (_, error) => this.logger.error(error),
            requestHandler: this.createRequestHandler(),
            failedRequestHandler: (context, error) => this.handleFailedRequest(job, context, error)
        }, bieniciConfig);
    }

    protected async preNavigationHook(context: PlaywrightCrawlingContext, job: Job) {
        const { page } = context;
        page.on('response', async (response) => {
            const url = response.url();
            if (url.match(/realEstateAd\.json\?id=.*$/)) {
                // SINGLE AD PAGE
                let body = await response.json();
                if (body) {
                    await this.dataProcessingService.process([{ ...body, url: page.url() }], 'bienici-crawler');
                    await job.update({
                        ...job.data,
                        total_data_grabbed: job.data['total_data_grabbed'] + 1,
                    })
                }
            }
            if (url.match(/realEstateAds\.json\?filters=.*$/)) {
                // LIST PAGE
                let body = await response.json();
                if (body) {
                    let ads = body.realEstateAds || [];
                    await page.evaluate((ads) => { window['crawled_ads'] = ads; }, ads);
                }
            }
        })
    }

    protected createRequestHandler(): RouterHandler<PlaywrightCrawlingContext<Dictionary>> {
        const router = createPlaywrightRouter();
        router.addDefaultHandler(async (context) => await this.listHandler(context));
        router.addHandler('ad-single-url', async (context) => await this.handleSingleAd(context));
        return router
    }

    protected async listHandler(context: PlaywrightCrawlingContext) {
        const { page, enqueueLinks } = context;
        await page.waitForLoadState('domcontentloaded');
        const ads = await this.filterAds(page);
        if (ads.length === 0) {
            this.logger.log("Found ads older than check_date. Stopping the crawler.");
            return;
        }
        const links_urls = await this.extract_links(ads, page);
        await enqueueLinks({ urls: links_urls, label: 'ad-single-url' });
        const nextPageHtml = await page.$("#searchResultsContainer > div.vue-pagination.pagination > div.pagination__nav-buttons > a.pagination__go-forward-button");
        const nextPage = await nextPageHtml?.getAttribute('href');
        if (nextPage) {
            await enqueueLinks({ urls: [`https://www.bienici.com${nextPage}`] });
        }
    }

    protected async handleSingleAd(context: PlaywrightCrawlingContext) {
        const { page } = context;
        await page.waitForLoadState('domcontentloaded');
        await page.evaluate(() => { window['crawled_ads'] = []; });
    }

    protected async filterAds(page: Page) {
        const ads = await page.evaluate(() => window['crawled_ads']);
        if (!ads || ads.length === 0) {
            throw new Error('No ads found');
        }
        const previousDay = new Date(this.checkDate);
        previousDay.setDate(this.checkDate.getDate() - 1);
        return ads.filter((ad: any) => {
            const adDate = new Date(ad.modificationDate);
            return this.isSameDay(adDate, this.checkDate) || this.isSameDay(adDate, previousDay);
        });
    }

    protected isSameDay(date1: Date, date2: Date) {
        return date1.getUTCFullYear() === date2.getUTCFullYear() &&
            date1.getUTCMonth() === date2.getUTCMonth() &&
            date1.getUTCDate() === date2.getUTCDate();
    }

    protected async extract_links(ads: any[], page: Page): Promise<string[]> {
        const baseUrl = 'https://www.bienici.com';
        return Promise.all(ads.map(async (ad: any) => {
            const adLinkHtml = await page.$(`article[data-id="${ad.id}"]  a`);
            const adLink = await adLinkHtml?.getAttribute('href');
            return adLink ? `${baseUrl}${adLink}` : ''
        }));
    }

    protected async handleFailedRequest(job: Job, { request, proxyInfo }: any, error: Error) {
        await job.update({
            ...job.data,
            error_date: new Date(),
            status: 'failed',
            attempts_count: job.data['attempts_count'] + 1,
            failedReason: request.errorMessages?.slice(-1)[0] || error.message || 'Unknown error',
            failed_request_url: request.url || 'N/A',
            proxy_used: proxyInfo ? proxyInfo.url : 'N/A',
        });
    }

    protected async handleFailure(job: Job, stats: FinalStatistics) {
        if (job.data['status'] && job.data['status'] === 'failed') {
            await job.update({
                ...job.data,
                total_request: stats.requestsTotal,
                success_requests: stats.requestsFinished,
                failed_requests: stats.requestsFailed,
            })
            await job.moveToFailed(job.data['failedReason']);
            return;
        }
        if (stats.requestsTotal === 0) {
            await job.update({
                ...job.data,
                error_date: new Date(),
                status: 'failed',
                total_request: stats.requestsTotal,
                attempts_count: job.data['attempts_count'] + 1,
                failed_requests: stats.requestsFailed,
                failed_request_url: 'N/A',
                proxy_used: 'N/A',
                failedReason: 'Crawler did not start as expected'
            })
            await job.moveToFailed(job.data['failedReason']);
        }
    }

    protected async handleSuccess(job: Job, stats: FinalStatistics) {
        await job.update({
            ...job.data,
            success_date: new Date(),
            status: 'success',
            total_request: stats.requestsTotal,
            attempts_count: job.data['attempts_count'] + 1,
            success_requests: stats.requestsFinished,
            failed_requests: stats.requestsFailed,
        });
    }
}
