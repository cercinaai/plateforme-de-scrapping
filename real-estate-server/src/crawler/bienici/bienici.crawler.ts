import { Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { DataProcessingService } from "../../data-processing/data-processing.service";
import { Job } from "bull";
import { bieniciConfig } from "./../../config/crawler.config";
import { bieniciCrawlerOption } from './../../config/playwright.config';
import { createPlaywrightRouter, Dictionary, FinalStatistics, PlaywrightCrawler, PlaywrightCrawlingContext, RequestQueue, RouterHandler } from "crawlee";
import { Page } from "playwright";
import { HttpService } from "@nestjs/axios";
import { CRAWLER_ORIGIN } from "../utils/enum";
import { CrawlerInterface } from "../crawler.interface";
import { handleCrawlerError, handleCrawlerState } from "../utils/handleCrawlerState.util";
import { preBieniciHooksRegister } from "./preNavigation/preHooks.register";
import { createBienIciRouter } from "./router/bienici.router";

@Processor('crawler')
export class BieniciCrawler implements CrawlerInterface {
    protected readonly targetUrl = "https://www.bienici.com/recherche/achat/france/maisonvilla,appartement,parking,terrain,loft,commerce,batiment,chateau,local,bureau,hotel,autres?mode=liste&tri=publication-desc";

    constructor(protected readonly dataProcessingService: DataProcessingService) { }

    @Process({ name: 'bienici-crawler' })
    async start(job: Job) {
        await this.initialize(job);
        const stat = await this.crawl(job);
        await handleCrawlerState(job, stat);
    }

    async initialize(job: Job): Promise<void> {
        await job.update({
            check_date: new Date(),
            crawler_origin: 'bienici',
            status: 'running',
            AD_LIMIT: 1500,
            total_data_grabbed: 0,
            attempts_count: 0,
            PAGE_REACHED: 1
        })
    }
    async crawl(job: Job): Promise<FinalStatistics> {
        const crawler = await this.configureCrawler(job);
        const stat = await crawler.run([this.targetUrl]);
        await crawler.requestQueue.drop();
        await crawler.teardown();
        return stat;
    }

    async configureCrawler(job: Job): Promise<PlaywrightCrawler> {
        const request_queue = await RequestQueue.open('bienici-crawler-queue');
        return new PlaywrightCrawler({
            ...bieniciCrawlerOption,
            requestQueue: request_queue,
            preNavigationHooks: preBieniciHooksRegister,
            requestHandler: await createBienIciRouter(job, this.dataProcessingService),
            failedRequestHandler: async (context, error) => await handleCrawlerError(error, job, context),
            errorHandler: async ({ log }, error) => log.error(error.message),
        }, bieniciConfig)
    }
}
