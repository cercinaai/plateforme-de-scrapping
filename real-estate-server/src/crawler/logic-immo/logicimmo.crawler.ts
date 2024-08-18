import { Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { Job } from "bull";
import { PlaywrightCrawler, FinalStatistics } from "crawlee";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Ad } from "../../models/ad.schema";
import { DataProcessingService } from "../../data-processing/data-processing.service";
import { logicimmoConfig, logicimmoCrawlerOption } from "./logicimmo.config";
import { Page } from "playwright";

@Processor('crawler')
export class LogicImmoCrawler {
    private readonly logger = new Logger(LogicImmoCrawler.name);
    private readonly LIMIT_PAGE = 20;
    private readonly franceLocalities = ['ile-de-france,1_0', 'alsace,10_0', 'aquitaine,15_0', 'Auvergne,19_0', 'Bretagne,13_0',
        'centre,5_0', 'Bourgogne,7_0', 'champagne-ardenne,2_0', 'corse,22_0',
        'franche-comte,11_0', 'languedoc-roussillon,20_0', 'limousin,17_0', 'lorraine,9_0',
        'basse-normandie,6_0', 'midi-pyrenees,16_0', 'nord-pas-de-calais,8_0', 'pays-de-la-loire,12_0',
        'picardie,3_0', 'poitou-charentes,14_0', 'provence-alpes-cote-d-azur,21_0', 'rhone-alpes,18_0', 'haute-normandie,4_0'
    ];


    constructor(
        private readonly dataProcessingService: DataProcessingService,
        @InjectModel(Ad.name) private readonly adModel: Model<Ad>
    ) { }

    @Process('logicimmo-crawler')
    async start(job: Job) {
        let { localiteIndex, listPage, totalDataGrabbed, attemptsCount, retryingFailedRequest } = this.initializeJobData(job);

        const crawler = this.createCrawler(job, localiteIndex, listPage, totalDataGrabbed, attemptsCount);
        const stats = await crawler.run([retryingFailedRequest || this.constructUrl(localiteIndex, listPage)]);
        await crawler.teardown();

        if (stats.requestsFailed > 0 || stats.requestsTotal === 0) {
            await this.handleFailure(job, stats);
        } else {
            await this.handleSuccess(job, stats, totalDataGrabbed, attemptsCount);
        }
    }

    private initializeJobData(job: Job) {
        return {
            localiteIndex: 0,
            listPage: 1,
            totalDataGrabbed: job.data['total_data_grabbed'] || 0,
            attemptsCount: job.data['attempts_count'] || 0,
            retryingFailedRequest: job.data['failed_request_url'] || null
        };
    }

    private createCrawler(job: Job, localiteIndex: number, listPage: number, totalDataGrabbed: number, attemptsCount: number) {
        return new PlaywrightCrawler({
            ...logicimmoCrawlerOption,
            requestHandler: this.createRequestHandler(job, localiteIndex, listPage, totalDataGrabbed).bind(this),
            errorHandler: this.handleError.bind(this),
            failedRequestHandler: this.handleFailedRequest.bind(this, job, totalDataGrabbed, attemptsCount),
        }, logicimmoConfig);
    }

    private createRequestHandler(job: Job, localiteIndex: number, listPage: number, totalDataGrabbed: number) {
        return async ({ page, enqueueLinks, closeCookieModals, waitForSelector }: any) => {
            await closeCookieModals();
            await page.waitForTimeout(1200);

            const ads = await page.evaluate(() => window['thor']['dataLayer']['av_items']);
            if (await this.stopCrawler(ads, page, localiteIndex)) return;

            const formattedAds = await this.formatAds(ads, page);
            await this.dataProcessingService.process(formattedAds, 'logicimmo-crawler');
            totalDataGrabbed += formattedAds.length;

            if (await this.limitPageReached(listPage)) return;
            listPage++;

            if (await this.handlePagination(localiteIndex, listPage, enqueueLinks)) return;
        };
    }

    private async stopCrawler(ads: any[], page: Page, localiteIndex: number): Promise<boolean> {
        const ids = ads.map(ad => ad.id.toString());
        const existingAds = await this.adModel.find({ adId: { $in: ids }, origin: 'logic-immo' });
        if (existingAds.length === 0) return false;
        if (existingAds.length < ids.length) {
            const adsToInsert = ads.filter(ad => !existingAds.find(existAd => existAd.adId === ad.id.toString()));
            const formattedAds = await this.formatAds(adsToInsert, page);
            await this.dataProcessingService.process(formattedAds, 'logicimmo-crawler');
            return true;
        }

        return localiteIndex === this.franceLocalities.length - 1;
    }

    private async handlePagination(localiteIndex: number, listPage: number, enqueueLinks: any): Promise<boolean> {
        if (listPage > this.LIMIT_PAGE || localiteIndex >= this.franceLocalities.length - 1) return true;

        localiteIndex++;
        listPage = 1;

        await enqueueLinks({
            urls: [this.constructUrl(localiteIndex, listPage)],
            label: 'next_page',
        });

        return false;
    }

    private async formatAds(ads: any[], page: Page): Promise<any[]> {
        return Promise.all(ads.map(async (ad: any) => {
            const id = this.escapeId(ad.id);
            const [title, pictureUrl, description, agencyName, agencyUrl] = await Promise.all([
                this.getTextContent(page, `#${id} > span.announceDtlInfosPropertyType`),
                this.getAttribute(page, `#${id} > div.announceContent.announceSearch > div.leftContent > picture > img`, 'src'),
                this.getTextContent(page, `#${id} > div.announceContent.announceSearch > div.announceDtl > div.announceDtlDescription`),
                this.getTextContent(page, `#${id} > div.topAnnounce.announceSearch > div > span > a`),
                this.getAttribute(page, `#${id} > div.topAnnounce.announceSearch > div > a`, 'href'),
            ]);

            return { ...ad, title, pictureUrl, description, agencyName, agencyUrl };
        }));
    }

    private escapeId(id: string): string {
        return id.replace(/([#;&,.+*~':"!^$[\]()=>|/@])/g, '\\$1').replace(/^\d/, '\\3$& ');
    }

    private async getTextContent(page: Page, selector: string): Promise<string> {
        const element = await page.$(selector);
        return element ? await element.textContent() : '';
    }

    private async getAttribute(page: Page, selector: string, attribute: string): Promise<string> {
        const element = await page.$(selector);
        return element ? await element.getAttribute(attribute) : '';
    }

    private async limitPageReached(currentPage: number): Promise<boolean> {
        const logicImmoAdsCount = await this.adModel.countDocuments({ origin: 'logic-immo' });
        return logicImmoAdsCount > 0 || currentPage > this.LIMIT_PAGE;
    }

    private async handleError({ request, proxyInfo }: any, error: Error) {
        this.logger.error(error);
    }

    private async handleFailedRequest(job: Job, totalDataGrabbed: number, attemptsCount: number, { request, proxyInfo }: any, error: Error) {
        await job.update({
            ...job.data,
            job_id: job.id.toString(),
            error_date: new Date(),
            crawler_origin: 'logic-immo',
            status: 'failed',
            total_data_grabbed: totalDataGrabbed,
            attempts_count: attemptsCount + 1,
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
        await job.moveToFailed(job.data['failedReaseon'], false);
    }

    private async handleSuccess(job: Job, stats: FinalStatistics, totalDataGrabbed: number, attemptsCount: number) {
        await job.update({
            ...job.data,
            success_date: new Date(),
            crawler_origin: 'logic-immo',
            status: 'success',
            total_request: stats.requestsTotal,
            total_data_grabbed: totalDataGrabbed,
            attempts_count: attemptsCount + 1,
            success_requests: stats.requestsFinished,
            failed_requests: stats.requestsFailed,
        });
    }
    private constructUrl(localiteIndex: number, listPage: number): string {
        const locality = this.franceLocalities[localiteIndex];
        return `https://www.logic-immo.com/vente-immobilier-${locality}/options/groupprptypesids=1,2,6,7,12,3,18,4,5,14,13,11,10,9,8/searchoptions=0,1,3/page=${listPage}/order=update_date_desc`;
    }

}