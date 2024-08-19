import { Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { DataProcessingService } from "../../data-processing/data-processing.service";
import { Job } from "bull";
import { bieniciConfig, bieniciCrawlerOption } from "./bienici.config";
import { FinalStatistics, PlaywrightCrawler } from "crawlee";
import { Page } from "playwright";

@Processor('crawler')
export class BieniciCrawler {
    private readonly logger = new Logger(BieniciCrawler.name);
    private readonly targetUrl = "https://www.bienici.com/recherche/achat/france/maisonvilla,appartement,parking,terrain,loft,commerce,batiment,chateau,local,bureau,hotel,autres?mode=liste&tri=publication-desc";

    constructor(private dataProcessingService: DataProcessingService) { }

    @Process('bienici-crawler')
    async start(job: Job) {
        await job.update({
            ...job.data,
            total_data_grabbed: 0,
            attempts_count: 0
        })
        const checkDate = new Date();
        const crawler = this.createCrawler(job, checkDate);
        const stats = await crawler.run([this.targetUrl]);
        await crawler.teardown();
        if (job.data['status'] && job.data['status'] === 'failed') {
            await this.handleFailure(job, stats);
        } else {
            await this.handleSuccess(job, stats);
        }
    }

    private createCrawler(job: Job, checkDate: Date) {
        return new PlaywrightCrawler({
            ...bieniciCrawlerOption,
            preNavigationHooks: [this.preNavigationHook.bind(this)],
            postNavigationHooks: [this.postNavigationHook.bind(this)],
            requestHandler: this.createRequestHandler(checkDate, job).bind(this),
            errorHandler: this.handleError.bind(this),
            failedRequestHandler: this.handleFailedRequest.bind(this, job)
        }, bieniciConfig);
    }

    private async preNavigationHook({ page }: { page: Page }) {
        await page.route('https://www.bienici.com/realEstateAds**', async (route) => {
            const res = await route.fetch();
            const body = await res.json();
            const ads = body.realEstateAds || [];
            if (ads.length) {
                await route.continue();
                await page.evaluate((ads) => { window['crawled_ads'] = ads; }, ads);
            }
        });
    }

    private async postNavigationHook({ page }: { page: Page }) {
        await page.unrouteAll({ behavior: 'ignoreErrors' });
    }

    private createRequestHandler(checkDate: Date, job: Job) {
        return async ({ waitForSelector, page, enqueueLinks, log, closeCookieModals }: any) => {
            await closeCookieModals();
            await waitForSelector("#searchResults > div > div.resultsListContainer");
            const ads = await this.filterAds(page, checkDate);
            if (!ads.length) {
                this.logger.log("Found ads older than check_date. Stopping the crawler.");
                return;
            }
            const formattedAds = await this.formatAds(ads, page);
            await this.dataProcessingService.process(formattedAds, 'bienici-crawler');
            await job.update({
                ...job.data,
                total_data_grabbed: formattedAds.length + job.data['total_data_grabbed'],
            })
            await this.handlePagination(page, enqueueLinks, log);
        };
    }

    private async filterAds(page: Page, checkDate: Date) {
        const ads = await page.evaluate(() => window['crawled_ads']);
        const previousDay = new Date(checkDate);
        previousDay.setDate(checkDate.getDate() - 1);
        return ads.filter((ad: any) => {
            const adDate = new Date(ad.publicationDate);
            return this.isSameDay(adDate, checkDate) || this.isSameDay(adDate, previousDay);
        });
    }

    private isSameDay(date1: Date, date2: Date) {
        return date1.getUTCFullYear() === date2.getUTCFullYear() &&
            date1.getUTCMonth() === date2.getUTCMonth() &&
            date1.getUTCDate() === date2.getUTCDate();
    }

    private async formatAds(ads: any[], page: Page): Promise<any[]> {
        const baseUrl = 'https://www.bienici.com';
        return Promise.all(ads.map(async (ad: any) => {
            const adLinkHtml = await page.$(`article[data-id="${ad.id}"]  a`);
            const adLink = await adLinkHtml?.getAttribute('href');
            return { ...ad, url: adLink ? `${baseUrl}${adLink}` : '' };
        }));
    }

    private async handlePagination(page: Page, enqueueLinks: any, log: any) {
        const nextPageHtml = await page.$("#searchResultsContainer > div.vue-pagination.pagination > div.pagination__nav-buttons > a.pagination__go-forward-button");
        const nextPage = await nextPageHtml?.getAttribute('href');
        log.info(nextPage || "NO NEXT PAGE");
        if (nextPage) {
            await enqueueLinks({ urls: [`https://www.bienici.com${nextPage}`], label: 'next_page' });
        }
    }

    private async handleError({ request, proxyInfo }: any, error: Error) {
        this.logger.error(error);
    }

    private async handleFailedRequest(job: Job, { request, proxyInfo }: any, error: Error) {
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

    private async handleFailure(job: Job, stats: FinalStatistics) {
        await job.update({
            ...job.data,
            total_request: stats.requestsTotal,
            success_requests: stats.requestsFinished,
            failed_requests: stats.requestsFailed,
        });
        await job.moveToFailed(job.data['failedReason'], false);
    }

    private async handleSuccess(job: Job, stats: FinalStatistics) {
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
