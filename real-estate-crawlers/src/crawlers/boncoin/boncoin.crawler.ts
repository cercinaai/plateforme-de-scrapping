import { Job } from "bullmq";
import { CRAWLER_ORIGIN, CRAWLER_STATUS } from "../../utils/enum";
import { initLogger } from "../../config/logger.config";
import { type FinalStatistics, PlaywrightCrawler, ProxyConfiguration, RequestQueue } from "crawlee";
import { boncoinCrawlerOption } from "../../config/playwright.config";
import { initProxy } from "../../config/proxy.config";
import { handleFailedCrawler } from "../../utils/handleCrawlerState.util";
import { boncoinConfig } from "../../config/crawlers.config";
import { createBoncoinRouter } from "./router/boncoin.router";
import { build_link } from "./router/handlers/boncoin-default.handler";


const logger = initLogger(CRAWLER_ORIGIN.BONCOIN);

export const start_boncoin_crawler = async (job: Job) => {
    logger.info('Starting boncoin crawler...');
    await initialize(job);
    const crawler = await create_crawler(job);
    const statistics = await crawl(job, crawler).catch(async (err) => {
        if (crawler.requestQueue) {
            await crawler.requestQueue.drop();
        }
        await crawler.teardown();
        throw err;
    });
    logger.info('Boncoin crawler finished!');
    return statistics;
}



const initialize = async (job: Job) => {
    logger.info('Initializing boncoin crawler...');
    await job.updateData({
        status: CRAWLER_STATUS.RUNNING,
        total_data_grabbed: 0,
        REGION_REACHED: 0,
        PAGE_REACHED: 1,
        france_locality: [
            { name: 'Île-de-France', link: 'r_12', limit: 3929 },
            { name: "Provence-Alpes-Côte d'Azur", link: 'r_21', limit: 2777 },
            { name: 'Centre-Val de Loire', link: 'r_37', limit: 594 },
            { name: 'Bourgogne-Franche-Comté', link: 'r_31', limit: 622 },
            { name: 'Normandie', link: 'r_34', limit: 749 },
            { name: 'Hauts-de-France', link: 'r_32', limit: 1052 },
            { name: 'Grand Est', link: 'r_33', limit: 1168 },
            { name: 'Pays de la Loire', link: 'r_18', limit: 1020 },
            { name: 'Bretagne', link: 'r_6', limit: 936 },
            { name: 'Nouvelle-Aquitaine', link: 'r_35', limit: 2112 },
            { name: 'Occitanie', link: 'r_36', limit: 2136 },
            { name: 'Auvergne-Rhône-Alpes', link: 'r_30', limit: 2495 },
            { name: 'Corse', link: 'r_9', limit: 155 },
            { name: 'Guadeloupe', link: 'r_23', limit: 128 },
            { name: 'Martinique', link: 'r_24', limit: 92 },
            { name: 'Guyane', link: 'r_25', limit: 36 }
            // { name: 'La Reunion', link: r_, limit: 42, },
            // { name: 'Mayotte', link: ['903'], limit: 1, },
        ]
    });
    logger.info('Boncoin crawler initialized!');
}

const create_crawler = async (job: Job): Promise<PlaywrightCrawler> => {
    logger.info('Creating boncoin crawler...');
    const boncoinQueue = await RequestQueue.open('boncoin-crawler-queue');
    const proxy_list = await initProxy();
    const router = await createBoncoinRouter(job);
    return new PlaywrightCrawler({
        ...boncoinCrawlerOption,
        requestQueue: boncoinQueue,
        proxyConfiguration: new ProxyConfiguration({ proxyUrls: proxy_list }),
        requestHandler: router,
        failedRequestHandler: async (context, error) => handleFailedCrawler(job, context, error),
        errorHandler: (_, error) => {
            logger.error(error);
        },
    }, boncoinConfig);
}

const crawl = async (job: Job, crawler: PlaywrightCrawler): Promise<FinalStatistics> => {
    logger.info('Starting boncoin crawler...');
    const statistics = await crawler.run([build_link(job)]);
    await crawler.requestQueue?.drop();
    await crawler.teardown();
    return statistics;
}