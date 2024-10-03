import { Job } from "bullmq";
import { CRAWLER_ORIGIN, CRAWLER_STATUS } from "../../utils/enum";
import { initLogger } from "../../config/logger.config";
import { type FinalStatistics, PlaywrightCrawler, ProxyConfiguration, RequestQueue } from "crawlee";
import { boncoinCrawlerOption } from "../../config/playwright.config";
import { initProxy } from "../../config/proxy.config";
import { handleFailedCrawler } from "../../utils/handleCrawlerState.util";
import { boncoinConfig, getCrawlersConfig } from "../../config/crawlers.config";
import { createBoncoinRouter } from "./router/boncoin.router";
import { build_link } from "./router/handlers/boncoin-default.handler";
import { transform_crawler_limits } from "../../utils/realEstateAds.utils";


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
    const { boncoin_limits } = await getCrawlersConfig();
    const regions = transform_crawler_limits(boncoin_limits);
    await job.updateData({
        status: CRAWLER_STATUS.RUNNING,
        total_data_grabbed: 0,
        REGION_REACHED: 0,
        PAGE_REACHED: 1,
        DATA_REACHED: 0,
        france_locality: regions
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