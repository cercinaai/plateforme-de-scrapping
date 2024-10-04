import { Job } from "bullmq";
import { FinalStatistics, PlaywrightCrawler, ProxyConfiguration, RequestQueue } from "crawlee";
import { CRAWLER_ORIGIN, CRAWLER_STATUS } from "../../utils/enum";
import { initLogger } from "../../config/logger.config";
import { initProxy } from "../../config/proxy.config";
import { selogerCrawlerOptions } from "../../config/playwright.config";
import { getCrawlersConfig, selogerConfig } from "../../config/crawlers.config";
import { build_link, createSelogerRouter } from "./router/seloger.router";
import { handleFailedCrawler } from "../../utils/handleCrawlerState.util";
import { transform_crawler_limits } from "../../utils/realEstateAds.utils";
import { crawl } from "../../utils/crawl.utils";


const logger = initLogger(CRAWLER_ORIGIN.SELOGER);

export const start_seloger_crawler = async (job: Job) => {
    logger.info('Starting seloger crawler...');
    await initialize(job);
    const crawler = await create_crawler(job);
    const statistics = await crawl(crawler, [build_link(job)]);
    logger.info('Seloger crawler finished!');
    return statistics;
}

const initialize = async (job: Job) => {
    logger.info('Initializing seloger crawler...');
    const { seloger_config } = await getCrawlersConfig();
    const regions = transform_crawler_limits(seloger_config);
    await job.updateData({
        status: CRAWLER_STATUS.RUNNING,
        total_data_grabbed: 0,
        REGION_REACHED: 0,
        PAGE_REACHED: 1,
        DATA_REACHED: 0,
        france_locality: regions
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

