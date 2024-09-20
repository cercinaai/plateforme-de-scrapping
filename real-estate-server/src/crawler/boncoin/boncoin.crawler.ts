import { FinalStatistics, PlaywrightCrawler, PlaywrightCrawlingContext, ProxyConfiguration, ProxyInfo, Request, RequestQueue, Session } from 'crawlee';
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { DataProcessingService } from '../../data-processing/data-processing.service';
import { boncoinConfig } from './../../config/crawler.config';
import { boncoinCrawlerOption } from './../../config/playwright.config';
import { ProxyService } from '../proxy.service';
import { CrawlerInterface } from '../crawler.interface';
import { handleCrawlerError, handleCrawlerState } from '../utils/handleCrawlerState.util';
import { createBoncoinRouter } from './router/boncoin.router';
import { preBoncoinHooksRegister } from './preNavigation/preHooks.register';
import { Model } from 'mongoose';
import { CrawlerSession } from 'src/models/crawlerSession.schema';
import { InjectModel } from '@nestjs/mongoose';

@Processor('crawler')
export class BoncoinCrawler implements CrawlerInterface {
    constructor(private readonly proxyService: ProxyService, private readonly dataProcessingService: DataProcessingService, @InjectModel(CrawlerSession.name) private crawlerSession: Model<CrawlerSession>) { }

    @Process({ name: 'boncoin-crawler' })
    async start(job: Job) {
        const { session_id } = job.data;
        await this.initialize(job);
        const stat = await this.crawl(job);
        const session_stats = await handleCrawlerState(job, stat);
        // UPDATE THE SESSION BY THE NEW STATS
        await this.crawlerSession.findByIdAndUpdate(session_id, { boncoin: session_stats });
    }

    async initialize(job: Job): Promise<void> {
        await job.update({
            crawler_origin: 'boncoin',
            check_date: new Date(),
            status: 'running',
            total_data_grabbed: 0,
            attempts_count: 0,
            REGION_REACHED: 0,
            PAGE_REACHED: 1,
            france_locality: [
                { name: 'Île-de-France', link: 'r_12', limit: 986 },
                { name: "Provence-Alpes-Côte d'Azur", link: 'r_21', limit: 697 },
                { name: 'Centre-Val de Loire', link: 'r_37', limit: 149 },
                { name: 'Bourgogne-Franche-Comté', link: 'r_31', limit: 156 },
                { name: 'Normandie', link: 'r_34', limit: 188 },
                { name: 'Hauts-de-France', link: 'r_32', limit: 264 },
                { name: 'Grand Est', link: 'r_33', limit: 293 },
                { name: 'Pays de la Loire', link: 'r_18', limit: 256 },
                { name: 'Bretagne', link: 'r_6', limit: 235 },
                { name: 'Nouvelle-Aquitaine', link: 'r_35', limit: 530 },
                { name: 'Occitanie', link: 'r_36', limit: 536 },
                { name: 'Auvergne-Rhône-Alpes', link: 'r_30', limit: 626 },
                { name: 'Corse', link: 'r_9', limit: 39 },
                { name: 'Guadeloupe', link: 'r_23', limit: 32 },
                { name: 'Martinique', link: 'r_24', limit: 23 },
                { name: 'Guyane', link: 'r_25', limit: 9 },
                // { name: 'La Reunion', link: r_, limit: 42, },
                // { name: 'Mayotte', link: ['903'], limit: 1, },
            ]
        })
    }
    async crawl(job: Job): Promise<FinalStatistics> {
        const crawler = await this.configureCrawler(job);
        const stat = await crawler.run([this._build_url(job)]);
        await crawler.requestQueue.drop();
        await crawler.teardown();
        return stat;
    }
    async configureCrawler(job: Job): Promise<PlaywrightCrawler> {
        const boncoinQueue = await RequestQueue.open('boncoin-crawler-queue');
        return new PlaywrightCrawler({
            ...boncoinCrawlerOption,
            requestQueue: boncoinQueue,
            preNavigationHooks: preBoncoinHooksRegister,
            requestHandler: await createBoncoinRouter(job, this.dataProcessingService),
            proxyConfiguration: new ProxyConfiguration({ proxyUrls: this.proxyService.get_proxy_list() }),
            failedRequestHandler: async (context, error) => await handleCrawlerError(error, job, context),
            errorHandler: async ({ log }, error) => log.error(error.message),
        }, boncoinConfig);
    }

    private _build_url(job: Job): string {
        const { link } = job.data.france_locality[job.data.REGION_REACHED]
        return `https://www.leboncoin.fr/recherche?category=9&locations=${link}&real_estate_type=1,2,3,4,5&immo_sell_type=old,new,viager&owner_type=pro`
    }
}