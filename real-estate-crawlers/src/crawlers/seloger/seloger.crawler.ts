import { Job } from "bullmq";
import { FinalStatistics, PlaywrightCrawler } from "crawlee";
import { CRAWLER_ORIGIN } from "../../utils/enum";
import { initLogger } from "../../config/logger.config";


const logger = initLogger(CRAWLER_ORIGIN.SELOGER);

export const start_seloger_crawler = async (job: Job) => {
    logger.info('Starting seloger crawler...');
    await initialize(job);
    // const crawler = await create_crawler(job);
    // const statistics = await crawl(job, crawler);
    // logger.info('Seloger crawler finished!');
    // return statistics;
}

const initialize = async (job: Job) => { }

// const create_crawler = async (job: Job): Promise<PlaywrightCrawler> => { }

// const crawl = async (job: Job, crawler: PlaywrightCrawler): Promise<FinalStatistics> => { }