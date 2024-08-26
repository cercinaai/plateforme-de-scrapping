import { Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { DataProcessingService } from "../../data-processing/data-processing.service";
import { Job } from "bull";
import { bieniciConfig } from "./../../config/crawler.config";
import { bieniciCrawlerOption } from './../../config/playwright.config';
import { createPlaywrightRouter, Dictionary, FinalStatistics, PlaywrightCrawler, PlaywrightCrawlingContext, RouterHandler } from "crawlee";
import { Page } from "playwright";
import { HttpService } from "@nestjs/axios";

@Processor('crawler')
export class BieniciCrawler {
    private readonly logger = new Logger(BieniciCrawler.name);
    protected readonly targetUrl = "https://www.bienici.com/recherche/achat/france/maisonvilla,appartement,parking,terrain,loft,commerce,batiment,chateau,local,bureau,hotel,autres?mode=liste&tri=publication-desc";

    constructor(protected readonly dataProcessingService: DataProcessingService, protected readonly httpService: HttpService) { }

    @Process('bienici-crawler')
    async start(job: Job) {
        await job.update({
            ...job.data,
            total_data_grabbed: 0,
            attempts_count: 0
        })
        this.logger.log(`Starting Crawler BienIci`);
        const crawler = this.createCrawler(job);
        const stats = await crawler.run([this.targetUrl]);
        await crawler.teardown();
        if (job.data['status'] && job.data['status'] === 'failed' || stats.requestsFailed > 0 || stats.requestsTotal === 0) {
            await this.handleFailure(job, stats);
        } else {
            await this.handleSuccess(job, stats);
        }
    }

    protected createCrawler(job: Job) {
        return new PlaywrightCrawler({
            ...bieniciCrawlerOption,
            preNavigationHooks: [async (context) => await this.preNavigationHook(context, job)],
            postNavigationHooks: [this.postNavigationHook.bind(this)],
            requestHandler: this.createRequestHandler(),
            failedRequestHandler: this.handleFailedRequest.bind(this, job)
        }, bieniciConfig);
    }

    protected async preNavigationHook(context: PlaywrightCrawlingContext, job: Job) {
        const { page } = context;
        await page.route('https://www.bienici.com/realEstateAd.json?id=**', async (route) => {
            const res = await route.fetch();
            const body = await res.json();
            const ad = body || null;
            if (ad) {
                await route.continue();
                this.dataProcessingService.process([{ ...ad, url: page.url() }], 'bienici-crawler');
                await job.update({
                    ...job.data,
                    total_data_grabbed: job.data['total_data_grabbed'] + 1,
                })
            }
        });
        await page.route('https://www.bienici.com/realEstateAds.json?filters=**', async (route) => {
            const res = await route.fetch();
            const body = await res.json();
            const ads = body.realEstateAds || [];
            if (ads.length > 0) {
                await route.continue();
                await page.evaluate((ads) => { window['crawled_ads'] = ads; }, ads);
            }
        });
    }

    protected async postNavigationHook({ page }: PlaywrightCrawlingContext) {
        await page.unrouteAll({ behavior: 'ignoreErrors' });
    }

    protected createRequestHandler(): RouterHandler<PlaywrightCrawlingContext<Dictionary>> {
        const router = createPlaywrightRouter();
        router.addDefaultHandler(async (context) => await this.listHandler(context));
        router.addHandler('ad-single-url', async (context) => await this.handleSingleAd(context));
        return router
    }

    protected async listHandler(context: PlaywrightCrawlingContext, env?: 'test' | 'dev' | 'prod') {
        const checkDate = new Date();
        const { waitForSelector, page, enqueueLinks, closeCookieModals } = context;
        await closeCookieModals();
        await waitForSelector("#searchResults > div > div.resultsListContainer", 10000);
        const ads = await this.filterAds(page, checkDate);
        if (!ads || ads.length === 0) {
            this.logger.log("Found ads older than check_date. Stopping the crawler.");
            return;
        }
        const links_urls = await this.extract_links(ads, page);
        await enqueueLinks({ urls: links_urls, label: 'ad-single-url' });
        if (env && env === 'test') return;
        const nextPageHtml = await page.$("#searchResultsContainer > div.vue-pagination.pagination > div.pagination__nav-buttons > a.pagination__go-forward-button");
        const nextPage = await nextPageHtml?.getAttribute('href');
        if (nextPage) {
            await enqueueLinks({ urls: [`https://www.bienici.com${nextPage}`] });
        }
    }

    protected async handleSingleAd(context: PlaywrightCrawlingContext) {
        const { closeCookieModals, waitForSelector } = context;
        await closeCookieModals();
        await waitForSelector('.section-detailedSheet');
    }

    protected async filterAds(page: Page, checkDate: Date) {
        const ads = await page.evaluate(() => window['crawled_ads']);
        if (!ads || ads.length === 0) return [];
        const previousDay = new Date(checkDate);
        previousDay.setDate(checkDate.getDate() - 1);
        return ads.filter((ad: any) => {
            const adDate = new Date(ad.publicationDate);
            return this.isSameDay(adDate, checkDate) || this.isSameDay(adDate, previousDay);
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
            job_id: job.id.toString(),
            error_date: new Date(),
            crawler_origin: 'bienici',
            status: 'failed',
            attempts_count: job.data['attempts_count'] + 1,
            failedReason: request.errorMessages?.slice(-1)[0] || error.message || 'Unknown error',
            failed_request_url: request.url || 'N/A',
            proxy_used: proxyInfo ? proxyInfo.url : 'N/A',
        });
    }

    protected async handleFailure(job: Job, stats: FinalStatistics) {
        await job.update({
            ...job.data,
            total_request: stats.requestsTotal,
            success_requests: stats.requestsFinished,
            failed_requests: stats.requestsFailed,
        });
        await job.moveToFailed(job.data['failedReason'], false);
    }

    protected async handleSuccess(job: Job, stats: FinalStatistics) {
        await job.update({
            ...job.data,
            success_date: new Date(),
            crawler_origin: 'bienici',
            status: 'success',
            total_request: stats.requestsTotal,
            attempts_count: job.data['attempts_count'] + 1,
            success_requests: stats.requestsFinished,
            failed_requests: stats.requestsFailed,
        });
    }
}
