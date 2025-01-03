import { Queue, Worker } from 'bullmq';
import { initRedis } from '../config/redis.config';
import { CRAWLER_ORIGIN } from '../utils/enum';
import { start_boncoin_crawler } from './boncoin/boncoin.crawler';
import { start_seloger_crawler } from './seloger/seloger.crawler';
import { start_bienici_crawler } from './bienici/bienici.crawler';
import { start_france_travail_crawler } from './france-travail/france-travail.crawler';
import { start_logicimmo_crawler } from './logic-immo/logicimmo.crawler';
import { handleCompletedJob, handleFailedJob } from '../utils/handleCrawlerState.util';
import { CrawlerSessionModel } from '../models/mongodb/crawler-session.mongodb';
import { getCrawlersConfig } from '../config/crawlers.config';
import { CrawlerConfig } from '../models/mongodb/crawler-config.mongodb';
import { log } from 'winston';
import { Logger } from 'crawlee';


export const start_crawlers = async () => {
    console.log(new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }));

    const config = await getCrawlersConfig();
    const { can_crawl, seloger_config, boncoin_limits, bienici_limits, logicimmo_limits } = config;
    if (!can_crawl) return;
    const session_id = await create_initial_session()
    const crawlers_queue = await create_crawler_queue(config);
    const crawlers_worker = await create_worker(crawlers_queue,config,session_id);
    crawlers_worker.addListener('completed', async (job) => await handleCompletedJob(job, session_id));
    crawlers_worker.addListener('failed', async (job, error) => await handleFailedJob(job, error, session_id));
    await waitForSession(crawlers_queue, crawlers_worker);
}

export const start_crawlers_revision = async () => { }

const create_crawler_queue = async (config: CrawlerConfig) => {
    const crawlers_queue = new Queue('crawlers', initRedis());

    if (config.seloger_config.status === 'active') {
        console.log('Adding SELOGER to the queue');
        await crawlers_queue.add(CRAWLER_ORIGIN.SELOGER, {});
    }
    if (config.boncoin_limits.status === 'active') {
        console.log('Adding BONCOIN to the queue');
        await crawlers_queue.add(CRAWLER_ORIGIN.BONCOIN, {});
    }
    if (config.logicimmo_limits.status === 'active') {
        console.log('Adding LOGICIMMO to the queue');
        await crawlers_queue.add(CRAWLER_ORIGIN.LOGICIMMO, {});
    }
    if (config.bienici_limits.status === 'active') {
        console.log('Adding BIENICI to the queue');
        await crawlers_queue.add(CRAWLER_ORIGIN.BIENICI, {});
    }

    if (config.franceTravail_limits.status === 'active') {
        console.log('Adding France Travail to the queue');
        await crawlers_queue.add(CRAWLER_ORIGIN.FRANCE_TRAVAIL, {});
    }
    
    return crawlers_queue;
};



const create_worker = async (queue: Queue, config: CrawlerConfig,session_id: string) => {
    const crawlers_worker = new Worker(queue.name, async (job) => {
        if (job.name === CRAWLER_ORIGIN.BONCOIN) {
            if (config.boncoin_limits.status !== 'active') {
                console.log('BONCOIN is inactive, skipping...');
                return; 
            }
            return start_boncoin_crawler(job);
        }
        if (job.name === CRAWLER_ORIGIN.SELOGER) {
            if (config.seloger_config.status !== 'active') {
                console.log('SELOGER is inactive, skipping...');
                return;
            }
            return start_seloger_crawler(job);
        }
        if (job.name === CRAWLER_ORIGIN.LOGICIMMO) {
            if (config.logicimmo_limits.status !== 'active') {
                console.log('LOGICIMMO is inactive, skipping...');
                return;
            }
            return start_logicimmo_crawler(job);
        }
        if (job.name === CRAWLER_ORIGIN.BIENICI) {
            if (config.bienici_limits.status !== 'active') {
                console.log('BIENICI is inactive, skipping...');
                return;
            }
            return start_bienici_crawler(job);
        }
        
        if (job.name === CRAWLER_ORIGIN.FRANCE_TRAVAIL) {
            if (config.franceTravail_limits.status !== "active") {
                console.log("France Travail is inactive, skipping...");
                return;
            }
            
            return start_france_travail_crawler(session_id);
        }
        


    }, { ...initRedis(), autorun: false, concurrency: 1 });
    return crawlers_worker;
};


const waitForSession = async (queue: Queue, worker: Worker) => {
    await worker.run();
    while (worker.isRunning()) {
        const activeJobs = await queue.getActiveCount();
        const waitingJobs = await queue.getWaitingCount();
        if (activeJobs === 0 && waitingJobs === 0) break;
        await new Promise(resolve => setTimeout(resolve, 120_000));
    }
    worker.removeAllListeners();
    queue.removeAllListeners();
    await worker.close();
    await queue.close();
}

const create_initial_session = async (): Promise<string> => {
    const crawler_session = {
        session_date: new Date(),
        crawlers_stats: []
    };
    const { _id } = await CrawlerSessionModel.create(crawler_session);
    return _id.toString();
}