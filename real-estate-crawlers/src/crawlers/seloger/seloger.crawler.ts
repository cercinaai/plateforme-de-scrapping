import { Job } from "bullmq";
import { FinalStatistics, PlaywrightCrawler, ProxyConfiguration, RequestQueue } from "crawlee";
import { CRAWLER_ORIGIN, CRAWLER_STATUS } from "../../utils/enum";
import { initLogger } from "../../config/logger.config";
import { initProxy } from "../../config/proxy.config";
import { selogerCrawlerOptions } from "../../config/playwright.config";
import { selogerConfig } from "../../config/crawlers.config";
import { build_link, createSelogerRouter } from "./router/seloger.router";
import { handleFailedCrawler } from "../../utils/handleCrawlerState.util";


const logger = initLogger(CRAWLER_ORIGIN.SELOGER);

export const start_seloger_crawler = async (job: Job) => {
    logger.info('Starting seloger crawler...');
    await initialize(job);
    const crawler = await create_crawler(job);
    const statistics = await crawl(job, crawler).catch(async (err) => {
        if (crawler.requestQueue) {
            await crawler.requestQueue.drop();
        }
        await crawler.teardown();
        throw err;
    });
    logger.info('Seloger crawler finished!');
    return statistics;
}

const initialize = async (job: Job) => {
    logger.info('Initializing seloger crawler...');
    await job.updateData({
        status: CRAWLER_STATUS.RUNNING,
        total_data_grabbed: 0,
        REGION_REACHED: 0,
        PAGE_REACHED: 1,
        france_locality: [
            { name: 'Île-de-France', link: ['2238'], limit: 3980 },
            { name: "Provence-Alpes-Côte d'Azur", link: ['2246'], limit: 2813 },
            { name: 'Centre-Val de Loire', link: ['2234'], limit: 601 },
            { name: 'Bourgogne-Franche-Comté', link: ['2232'], limit: 630 },
            { name: 'Normandie', link: ['2236', '2231'], limit: 759 },
            { name: 'Hauts-de-France', link: ['2243', '2244'], limit: 1066 },
            { name: 'Grand Est', link: ['2228', '2235', '2241'], limit: 1183 },
            { name: 'Pays de la Loire', link: ['2247'], limit: 1033 },
            { name: 'Bretagne', link: ['2233'], limit: 949 },
            { name: 'Nouvelle-Aquitaine', link: ['2229'], limit: 2139 },
            { name: 'Occitanie', link: ['2239', '2242'], limit: 2163 },
            { name: 'Auvergne-Rhône-Alpes', link: ['2251', '2230'], limit: 2527 },
            { name: 'Corse', link: ['2248'], limit: 157 }
            // { name: 'Guadeloupe', link: ['900'], limit: 32, data_grabbed: 0 },
            // { name: 'Martinique', link: ['902'], limit: 23, data_grabbed: 0 },
            // { name: 'Guyane', link: ['903'], limit: 9, data_grabbed: 0 },
            // { name: 'La Reunion', link: ['906'], limit: 42, data_grabbed: 0 },
            // { name: 'Mayotte', link: ['903'], limit: 1, data_grabbed: 0 },
        ]
    });
    logger.info('Seloger initialized!');
}

const create_crawler = async (job: Job): Promise<PlaywrightCrawler> => {
    logger.info('Creating Seloger Crawler');
    const selogerQueue = await RequestQueue.open('seloger-crawler-queue');
    const proxy_list = await initProxy();
    const router = await createSelogerRouter(job);
    return new PlaywrightCrawler({
        ...selogerCrawlerOptions,
        requestQueue: selogerQueue,
        proxyConfiguration: new ProxyConfiguration({ proxyUrls: proxy_list }),
        requestHandler: router,
        failedRequestHandler: async (context, error) => handleFailedCrawler(job, context, error),
        errorHandler: (_, error) => {
            logger.error(error);
        },
    }, selogerConfig);
}

const crawl = async (job: Job, crawler: PlaywrightCrawler): Promise<FinalStatistics> => {
    logger.info('Starting Seloger crawler...');
    const statistics = await crawler.run([build_link(job)]);
    await crawler.requestQueue?.drop();
    await crawler.teardown();
    return statistics;
}