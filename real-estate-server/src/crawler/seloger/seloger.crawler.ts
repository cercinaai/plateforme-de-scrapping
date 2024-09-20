import { Process, Processor } from "@nestjs/bull";
import { DataProcessingService } from "../../data-processing/data-processing.service";
import { Job } from "bull";
import { FinalStatistics, PlaywrightCrawler, PlaywrightCrawlingContext, ProxyConfiguration, RequestQueue } from "crawlee";
import { selogerConfig } from "../../config/crawler.config";
import { selogerCrawlerOptions } from "../../config/playwright.config";
import { ProxyService } from "../proxy.service";
import { InjectModel } from "@nestjs/mongoose";
import { Ad } from "../../models/ad.schema";
import { Model } from "mongoose";
import { CrawlerInterface } from "../crawler.interface";
import { createSelogerRouter } from './router/seloger.router';
import { handleCrawlerError, handleCrawlerState } from "../utils/handleCrawlerState.util";
import { preSelogerHooksRegister } from "./preNavigation/preHooks.register";
import { postSelogerHooksRegister } from "./postNavigation/postHooks.register";
import { CrawlerSession } from "src/models/crawlerSession.schema";

@Processor('crawler')
export class SelogerCrawler implements CrawlerInterface {

    constructor(private readonly proxyService: ProxyService, private readonly dataProcessingService: DataProcessingService, @InjectModel(CrawlerSession.name) private crawlerSession: Model<CrawlerSession>) { }

    @Process({ name: 'seloger-crawler' })
    async start(job: Job) {
        const { session_id } = job.data;
        await this.initialize(job);
        const stat = await this.crawl(job);
        const session_stats = await handleCrawlerState(job, stat);
        // UPDATE THE SESSION BY THE NEW STATS
        await this.crawlerSession.findByIdAndUpdate(session_id, { seloger: session_stats });
    }



    async crawl(job: Job): Promise<FinalStatistics> {
        const crawler = await this.configureCrawler(job);
        const stat = await crawler.run([this._build_url(job)]);
        await crawler.requestQueue.drop();
        await crawler.teardown();
        return stat;
    }

    async configureCrawler(job: Job): Promise<PlaywrightCrawler> {
        const selogerQueue = await RequestQueue.open('seloger-crawler-queue');
        return new PlaywrightCrawler({
            ...selogerCrawlerOptions,
            requestQueue: selogerQueue,
            preNavigationHooks: preSelogerHooksRegister,
            postNavigationHooks: postSelogerHooksRegister,
            requestHandler: await createSelogerRouter(job, this.dataProcessingService),
            failedRequestHandler: async (context, error) => await handleCrawlerError(error, job, context),
            proxyConfiguration: new ProxyConfiguration({ proxyUrls: this.proxyService.get_proxy_list() }),
            errorHandler: async ({ log }, error) => log.error(error.message),
        }, selogerConfig);
    }

    async initialize(job: Job): Promise<void> {
        await job.update({
            crawler_origin: 'seloger',
            total_data_grabbed: 0,
            attempts_count: 0,
            status: 'running',
            REGION_REACHED: 0,
            PAGE_REACHED: 1,
            france_locality: [
                { name: 'Île-de-France', link: ['2238'], limit: 986 },
                { name: "Provence-Alpes-Côte d'Azur", link: ['2246'], limit: 697 },
                { name: 'Centre-Val de Loire', link: ['2234'], limit: 149 },
                { name: 'Bourgogne-Franche-Comté', link: ['2232'], limit: 156 },
                { name: 'Normandie', link: ['2236', '2231'], limit: 188 },
                { name: 'Hauts-de-France', link: ['2243', '2244'], limit: 264 },
                { name: 'Grand Est', link: ['2228', '2235', '2241'], limit: 293 },
                { name: 'Pays de la Loire', link: ['2247'], limit: 256 },
                { name: 'Bretagne', link: ['2233'], limit: 235 },
                { name: 'Nouvelle-Aquitaine', link: ['2229'], limit: 530 },
                { name: 'Occitanie', link: ['2239', '2242'], limit: 536 },
                { name: 'Auvergne-Rhône-Alpes', link: ['2251', '2230'], limit: 626 },
                { name: 'Corse', link: ['2248'], limit: 39 },
                // { name: 'Guadeloupe', link: ['900'], limit: 32, data_grabbed: 0 },
                // { name: 'Martinique', link: ['902'], limit: 23, data_grabbed: 0 },
                // { name: 'Guyane', link: ['903'], limit: 9, data_grabbed: 0 },
                // { name: 'La Reunion', link: ['906'], limit: 42, data_grabbed: 0 },
                // { name: 'Mayotte', link: ['903'], limit: 1, data_grabbed: 0 },
            ]
        });
    }



    private _build_url(job: Job): string {
        const { link } = job.data.france_locality[job.data.REGION_REACHED]
        const grouped_urls = link.map((l: string) => ({ divisions: [parseInt(l)] }))
        const string_urls = JSON.stringify(grouped_urls)
        return `https://www.seloger.com/list.htm?projects=2,5&types=2,4,1,13,9,3,14,12,11,10&natures=1,2,4&places=${string_urls}&sort=d_dt_crea&mandatorycommodities=0&privateseller=0&enterprise=0&houseboat=1&qsVersion=1.0&m=search_refine-redirection-search_results`
    }



}
