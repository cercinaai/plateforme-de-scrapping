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
import { CRAWLER_ORIGIN } from "../utils/enum";

@Processor('crawler')
export class SelogerCrawler implements CrawlerInterface {

    constructor(private readonly proxyService: ProxyService, private readonly dataProcessingService: DataProcessingService, @InjectModel(Ad.name) private readonly adModel: Model<Ad>) { }

    @Process({ name: 'seloger-crawler' })
    async start(job: Job) {
        await this.initialize(job);
        const stat = await this.crawl(job);
        await handleCrawlerState(job, stat);
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
            requestHandler: await createSelogerRouter(job, this.dataProcessingService, this.shouldStopCrawler.bind(this)),
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
            france_locality: [
                { name: 'Île-de-France', link: ['2238'], limit: 986, data_grabbed: 0 },
                { name: 'Centre-Val de Loire', link: ['2234'], limit: 149, data_grabbed: 0 },
                { name: 'Bourgogne-Franche-Comté', link: ['2232'], limit: 156, data_grabbed: 0 },
                { name: 'Normandie', link: ['2236', '2231'], limit: 188, data_grabbed: 0 },
                { name: 'Hauts-de-France', link: ['2243', '2244'], limit: 264, data_grabbed: 0 },
                { name: 'Grand Est', link: ['2228', '2235', '2241'], limit: 293, data_grabbed: 0 },
                { name: 'Pays de la Loire', link: ['2247'], limit: 256, data_grabbed: 0 },
                { name: 'Bretagne', link: ['2233'], limit: 235, data_grabbed: 0 },
                { name: 'Nouvelle-Aquitaine', link: ['2229'], limit: 530, data_grabbed: 0 },
                { name: 'Occitanie', link: ['2239', '2242'], limit: 536, data_grabbed: 0 },
                { name: 'Auvergne-Rhône-Alpes', link: ['2251', '2230'], limit: 626, data_grabbed: 0 },
                { name: 'Corse', link: ['2248'], limit: 39, data_grabbed: 0 },
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


    private async shouldStopCrawler(ads: any[]): Promise<boolean> {
        const ids = ads.map(ad => ad.id.toString());
        const existingAds = await this.adModel.find({ adId: { $in: ids }, origin: 'seloger' });
        if (!existingAds || existingAds.length === 0) return false;
        if (existingAds.length < ids.length) {
            const newAds = ads.filter(ad => !existingAds.find(existingAd => existingAd.adId === ad.id.toString()));
            await this.dataProcessingService.process(newAds, CRAWLER_ORIGIN.SELOGER);
            return true;
        }
        if (existingAds.length === ids.length) return true;
    }
}
