import { Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { Job } from "bull";
import { PlaywrightCrawler, FinalStatistics, createPlaywrightRouter, RequestQueue, ProxyConfiguration } from "crawlee";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Ad } from "../../models/ad.schema";
import { DataProcessingService } from "../../data-processing/data-processing.service";
import { logicimmoConfig } from "../../config/crawler.config";
import { logicimmoCrawlerOption } from "../../config/playwright.config";
import { Page } from "playwright";
import { CRAWLER_ORIGIN } from "../utils/enum";
import { CrawlerInterface } from "../crawler.interface";
import { preLogicImmoHooksRegister } from "./preNavigation/preHooks.register";
import { createLogicImmoRouter } from "./router/logicimmo.router";
import { handleCrawlerError, handleCrawlerState } from "../utils/handleCrawlerState.util";
import { ProxyService } from "../proxy.service";

@Processor('crawler')
export class LogicImmoCrawler implements CrawlerInterface {

    // private readonly logger = new Logger(LogicImmoCrawler.name);

    constructor(protected dataProcessingService: DataProcessingService, private readonly proxyService: ProxyService) { }

    @Process({ name: 'logicimmo-crawler' })
    async start(job: Job) {
        await this.initialize(job);
        const stat = await this.crawl(job);
        await handleCrawlerState(job, stat);
    }


    async initialize(job: Job): Promise<void> {
        await job.update({
            crawler_origin: 'logic-immo',
            check_date: new Date(),
            status: 'running',
            total_data_grabbed: 0,
            attempts_count: 0,
            localite_index: 0,
            list_page: 1,
            LIMIT_REACHED: false,
            france_localities: [
                { link: 'ile-de-france,1_0', limit: 563, data_grabbed: 0 },
                { link: 'aquitaine,15_0', limit: 303, data_grabbed: 0 },
                { link: 'Auvergne,19_0', limit: 357, data_grabbed: 0 },
                { link: 'Bretagne,13_0', limit: 134, data_grabbed: 0 },
                { link: 'centre,5_0', limit: 85, data_grabbed: 0 },
                { link: 'Bourgogne,7_0', limit: 89, data_grabbed: 0 },
                { link: 'corse,22_0', limit: 23, data_grabbed: 0 },
                { link: 'franche-comte,11_0', limit: 89, data_grabbed: 0 },
                { link: 'basse-normandie,6_0', limit: 52, data_grabbed: 0 },
                { link: 'pays-de-la-loire,12_0', limit: 146, data_grabbed: 0 },
                { link: 'provence-alpes-cote-d-azur,21_0', limit: 398, data_grabbed: 0 },
                { link: 'haute-normandie,4_0', limit: 55, data_grabbed: 0 },
                // HAUTS DE FRANCE
                { link: 'picardie,3_0', limit: 75, data_grabbed: 0 },
                { link: 'nord-pas-de-calais,8_0', limit: 75, data_grabbed: 0 },
                // Occitanie
                { link: 'midi-pyrenees,16_0', limit: 153, data_grabbed: 0 },
                { link: 'languedoc-roussillon,20_0', limit: 153, data_grabbed: 0 },
                // GRAND EST
                { link: 'champagne-ardenne,2_0', limit: 56, data_grabbed: 0 },
                { link: 'lorraine,9_0', limit: 56, data_grabbed: 0 },
                { link: 'alsace,10_0', limit: 56, data_grabbed: 0 },
                // GUADELOUPE
                { link: 'guadeloupe-97,40266_1', limit: 18, data_grabbed: 0 },
                // GUYANE
                { link: 'guyane-973,40267_1', limit: 5, data_grabbed: 0 },
                { link: 'la-reunion-97,40270_1', limit: 24, data_grabbed: 0 },
                { link: 'martinique-97,40269_1', limit: 13, data_grabbed: 0 }
            ]
        })
    }

    async crawl(job: Job): Promise<FinalStatistics> {
        const crawler = await this.configureCrawler(job);
        const stat = await crawler.run([this.build_link(job)]);
        await crawler.requestQueue.drop();
        await crawler.teardown();
        return stat
    }
    async configureCrawler(job: Job): Promise<PlaywrightCrawler> {
        const request_queue = await RequestQueue.open('logicimmo-crawler-queue');
        return new PlaywrightCrawler({
            ...logicimmoCrawlerOption,
            requestQueue: request_queue,
            preNavigationHooks: preLogicImmoHooksRegister,
            requestHandler: await createLogicImmoRouter(job, this.dataProcessingService),
            proxyConfiguration: new ProxyConfiguration({ proxyUrls: this.proxyService.get_proxy_list() }),
            failedRequestHandler: async (context, error) => await handleCrawlerError(error, job, context),
            errorHandler: async ({ log }, error) => log.error(error.message),
        }, logicimmoConfig);
    }

    private build_link(job: Job): string {
        return `https://www.logic-immo.com/vente-immobilier-${job.data.france_localities[job.data.localite_index].link}/options/groupprptypesids=1,2,6,7,12,3,18,4,5,14,13,11,10,9,8/searchoptions=0,1/page=${job.data.list_page}/order=update_date_desc`;
    }

}
