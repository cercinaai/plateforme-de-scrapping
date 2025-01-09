import { Job } from "bullmq";
import { CRAWLER_ORIGIN, CRAWLER_STATUS } from "../../utils/enum";
import { initLogger } from "../../config/logger.config";
import { PlaywrightCrawler, ProxyConfiguration, RequestQueue } from "crawlee";
import { boncoinCrawlerOption } from "../../config/playwright.config";
import { initProxy } from "../../config/proxy.config";
import { handleFailedCrawler } from "../../utils/handleCrawlerState.util";
import { leboncoinGolfConfig, getCrawlersConfig } from "../../config/crawlers.config";
import { createLeboncoinGolfRouter } from "./router/boncoin-golf.router";
import { build_link } from "./router/handlers/boncoin-golf-default.handler";
import { transform_crawler_limits } from "../../utils/realEstateAds.utils";
import { crawl } from '../../utils/crawl.utils'

const logger = initLogger(CRAWLER_ORIGIN.LEBONCOIN_GOLF);

export const start_leboncoin_golf_crawler = async (job: Job) => {
  logger.info('Starting Leboncoin Golf crawler...');
  await initialize(job);
  const crawler = await create_crawler(job);
  const statistics = await crawl(crawler, [build_link(job)]);
  logger.info('Leboncoin Golf crawler finished!');
  return statistics;
}

const initialize = async (job: Job) => {
  logger.info('Initializing Leboncoin Golf crawler...');
  const { leboncoinGolf_limits } = await getCrawlersConfig();
  const regions = transform_crawler_limits(leboncoinGolf_limits);
  await job.updateData({
    status: CRAWLER_STATUS.RUNNING,
    total_data_grabbed: 0,
    REGION_REACHED: 0,
    PAGE_REACHED: 1,
    DATA_REACHED: 0,
    france_locality: regions
  });
  logger.info('Leboncoin Golf crawler initialized!');
}

const create_crawler = async (job: Job): Promise<PlaywrightCrawler> => {
  logger.info('Creating Leboncoin Golf crawler...');
  const leboncoinGolfQueue = await RequestQueue.open('leboncoin-golf-crawler-queue');
  const proxy_list = await initProxy();
  const router = await createLeboncoinGolfRouter(job);
  return new PlaywrightCrawler({
    ...boncoinCrawlerOption,
    requestQueue: leboncoinGolfQueue,
    proxyConfiguration: new ProxyConfiguration({ proxyUrls: proxy_list }),
    requestHandler: router,
    failedRequestHandler: async (context, error) => handleFailedCrawler(job, context, error),
    errorHandler: (_, error) => {
      logger.error(error);
    },
  }, leboncoinGolfConfig);
}
