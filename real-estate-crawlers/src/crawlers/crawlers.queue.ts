import { Queue, Worker } from 'bullmq';
import { initRedis } from '../config/redis.config';
import { CRAWLER_ORIGIN } from '../utils/enum';
import { start_boncoin_crawler } from './boncoin/boncoin.crawler';
import { start_seloger_crawler } from './seloger/seloger.crawler';
import { start_bienici_crawler } from './bienici/bienici.crawler';
import { start_logicimmo_crawler } from './logic-immo/logicimmo.crawler';
import { handleCompletedJob, handleFailedJob } from '../utils/handleCrawlerState.util';
import { CrawlerSessionModel } from '../models/mongodb/crawler-session.mongodb';
import { initLogger } from '../config/logger.config';
import { config } from 'dotenv';


export const start_crawlers = async () => {
    const crawlers_queue = await create_crawler_queue();
    const crawlers_worker = await create_worker(crawlers_queue);
    const session_id = await create_initial_session()
    crawlers_worker.on('completed', async (job) => handleCompletedJob(job, session_id));
    crawlers_worker.on('failed', async (job, error) => handleFailedJob(job, error, session_id));
    // SET A PROCESS TIMEOUT IF EXECEEDED STOP THE CRAWLERS
    await handleTimeOut(crawlers_queue, 43_200_000);
    await crawlers_worker.run();
}

export const start_crawlers_revision = async () => { }

const create_crawler_queue = async () => {
    const crawlers_queue = new Queue('crawlers', initRedis());
    await crawlers_queue.add(CRAWLER_ORIGIN.SELOGER, {});
    await crawlers_queue.add(CRAWLER_ORIGIN.BONCOIN, {});
    await crawlers_queue.add(CRAWLER_ORIGIN.LOGICIMMO, {});
    await crawlers_queue.add(CRAWLER_ORIGIN.BIENICI, {});
    return crawlers_queue
}

const create_worker = async (queue: Queue) => {
    const crawlers_worker = new Worker(queue.name, async (job) => {
        if (job.name === CRAWLER_ORIGIN.BONCOIN) return start_boncoin_crawler(job);
        if (job.name === CRAWLER_ORIGIN.SELOGER) return start_seloger_crawler(job);
        if (job.name === CRAWLER_ORIGIN.BIENICI) return start_bienici_crawler(job);
        if (job.name === CRAWLER_ORIGIN.LOGICIMMO) return start_logicimmo_crawler(job);
    }, { ...initRedis(), autorun: false, concurrency: 2 });
    return crawlers_worker
}


const create_initial_session = async (): Promise<string> => {
    const crawler_session = {
        session_date: new Date(),
        crawlers_stats: []
    };
    const { _id } = await CrawlerSessionModel.create(crawler_session);
    return _id.toString();
}

export const handleTimeOut = async (queue: Queue, ms: number) => {
    setTimeout(async () => {
        const logger = initLogger('GLOBAL-ERRORS');
        const ActiveJobs = await queue.getActive();
        const WaitingJobs = await queue.getWaiting();
        if (WaitingJobs.length === 0 && ActiveJobs.length === 0) return;
        logger.info('Crawlers timeout. Stopping...');
        ActiveJobs.map(async (job) => await job.moveToFailed(new Error('Crawlers timeout. Stopping...'), queue.token));
        WaitingJobs.map(async (job) => await job.moveToFailed(new Error('Crawlers timeout. Stopping...'), queue.token));
    }, ms);
}