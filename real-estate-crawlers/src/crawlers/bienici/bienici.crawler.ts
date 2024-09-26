import { Job } from "bullmq";
import { FinalStatistics, PlaywrightCrawler } from "crawlee";
import { initLogger } from "../../config/logger.config";
import { CRAWLER_ORIGIN } from "../../utils/enum";

const logger = initLogger(CRAWLER_ORIGIN.BIENICI);


export const start_bienici_crawler = async (job: Job) => {
    logger.info('Starting bienici crawler...');
    await initialize(job);
    // const crawler = await create_crawler(job);
    // const statistics = await crawl(job, crawler);
    // logger.info('Bienici crawler finished!');
    // return statistics;
}

const initialize = async (job: Job) => { }

// const create_crawler = async (job: Job): Promise<PlaywrightCrawler> => { }

// const crawl = async (job: Job, crawler: PlaywrightCrawler): Promise<FinalStatistics> => { }