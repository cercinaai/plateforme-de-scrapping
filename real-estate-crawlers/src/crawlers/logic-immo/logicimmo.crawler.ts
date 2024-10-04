import { Job } from "bullmq";
import { FinalStatistics, PlaywrightCrawler, ProxyConfiguration, RequestQueue } from "crawlee";
import { initLogger } from "../../config/logger.config";
import { CRAWLER_ORIGIN, CRAWLER_STATUS } from "../../utils/enum";
import { initProxy } from "../../config/proxy.config";
import { logicimmoCrawlerOption } from "../../config/playwright.config";
import { getCrawlersConfig, logicimmoConfig } from "../../config/crawlers.config";
import { handleFailedCrawler } from "../../utils/handleCrawlerState.util";
import { build_link, createLogicimmoRouter } from "./router/logicimmo.router";
import { transform_crawler_limits } from "../../utils/realEstateAds.utils";
import { crawl } from "../../utils/crawl.utils";

const logger = initLogger(CRAWLER_ORIGIN.LOGICIMMO);


export const start_logicimmo_crawler = async (job: Job) => {
    logger.info('Starting logicimmo crawler...');
    await initialize(job);
    const crawler = await create_crawler(job);
    const statistics = await crawl(crawler, [build_link(job)]);
    logger.info('Logicimmo crawler finished!');
    return statistics;
}


const initialize = async (job: Job) => {
    logger.info('Initializing logicimmo crawler...');
    const { logicimmo_limits } = await getCrawlersConfig();
    const regions = transform_crawler_limits(logicimmo_limits);
    await job.updateData({
        total_data_grabbed: 0,
        status: CRAWLER_STATUS.RUNNING,
        REGION_REACHED: 0,
        PAGE_REACHED: 1,
        DATA_REACHED: 0,
        france_locality: regions
    })
    logger.info('Logicimmo crawler initialized!');
}

const create_crawler = async (job: Job): Promise<PlaywrightCrawler> => {
    logger.info('Creating logicimmo crawler...');
    const logicimmoQueue = await RequestQueue.open('logicimmo-crawler-queue');
    const proxy_list = await initProxy();
    const router = await createLogicimmoRouter(job);
    return new PlaywrightCrawler({
        ...logicimmoCrawlerOption,
        requestQueue: logicimmoQueue,
        proxyConfiguration: new ProxyConfiguration({ proxyUrls: proxy_list }),
        requestHandler: router,
        failedRequestHandler: async (context, error) => handleFailedCrawler(job, context, error),
        errorHandler: (_, error) => {
            logger.error(error);
        },
    }, logicimmoConfig);
}