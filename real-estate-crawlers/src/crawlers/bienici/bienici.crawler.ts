import { Job } from "bullmq";
import { FinalStatistics, PlaywrightCrawler, RequestQueue } from "crawlee";
import { initLogger } from "../../config/logger.config";
import { CRAWLER_ORIGIN, CRAWLER_STATUS } from "../../utils/enum";
import { bieniciCrawlerOption } from "../../config/playwright.config";
import { bieniciConfig, getCrawlersConfig } from "../../config/crawlers.config";
import { handleFailedCrawler } from "../../utils/handleCrawlerState.util";
import { createBieniciRouter } from "./router/bienici.router";
import { bieniciPreNavigationHooks } from "./bienici-hooks.navigation";
import { crawl } from "../../utils/crawl.utils";

const logger = initLogger(CRAWLER_ORIGIN.BIENICI);


export const start_bienici_crawler = async (job: Job) => {
    logger.info('Starting bienici crawler...');
    const url = 'https://www.bienici.com/recherche/achat/france/maisonvilla,appartement,parking,terrain,loft,commerce,batiment,chateau,local,bureau,hotel,autres?mode=liste&tri=publication-desc';
    await initialize(job);
    const crawler = await create_crawler(job);
    const statistics = await crawl(crawler, [url]);
    logger.info('Bienici crawler finished!');
    return statistics;
}

const initialize = async (job: Job) => {
    logger.info('Initializing bienici crawler...');
    const { bienici_limits } = await getCrawlersConfig();
    await job.updateData({
        status: CRAWLER_STATUS.RUNNING,
        AD_LIMIT: bienici_limits.total,
        total_data_grabbed: 0,
        PAGE_REACHED: 1
    });
    logger.info('Bienici crawler initialized!');
}

const create_crawler = async (job: Job): Promise<PlaywrightCrawler> => {
    const bieniciQueue = await RequestQueue.open('bienici-crawler-queue');
    const router = await createBieniciRouter(job);
    return new PlaywrightCrawler({
        ...bieniciCrawlerOption,
        requestQueue: bieniciQueue,
        requestHandler: router,
        preNavigationHooks: bieniciPreNavigationHooks,
        failedRequestHandler: async (context, error) => handleFailedCrawler(job, context, error),
        errorHandler: (_, error) => {
            logger.error(error);
        },
    }, bieniciConfig);
}

