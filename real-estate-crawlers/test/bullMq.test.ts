import { Queue, UnrecoverableError, Worker } from 'bullmq';
import { expect, test, describe, afterAll, afterEach, beforeAll, expectTypeOf, beforeEach, } from 'vitest';
import { initRedis } from '../src/config/redis.config';
import { handleCompletedJob, handleFailedJob } from '../src/utils/handleCrawlerState.util';
import { CRAWLER_ORIGIN } from '../src/utils/enum';
import { config } from 'dotenv';

import { CrawlerStats } from '../src/models/mongodb/crawler-session.mongodb';
import { crawl } from '../src/utils/crawl.utils';
import { PlaywrightCrawler } from 'crawlee';



const initTestCrawler = (timeout: number) => {
    return new PlaywrightCrawler({
        headless: true,
        requestHandler: async () => {
            await new Promise((resolve) => setTimeout(resolve, timeout));
        }
    });
}


describe('BullMq Suite Tests', () => {
    config();
    let queue!: Queue
    beforeAll(async () => {
        queue = new Queue('crawlers_test_queue', initRedis());
    });

    afterAll(async () => {
        await queue.close();
    });

    test.sequential('Handles non-critical failure gracefully and continues with next job', { timeout: 20000 }, async () => {
        const worker = new Worker(queue.name, async (job) => {
            if (job.name === CRAWLER_ORIGIN.BONCOIN) {
                await new Promise((resolve) => setTimeout(resolve, 1000));
                throw new Error('test error');
            } else {
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
        }, { ...initRedis() });

        await queue.add(CRAWLER_ORIGIN.SELOGER, {});
        await queue.add(CRAWLER_ORIGIN.BONCOIN, {});
        await queue.add(CRAWLER_ORIGIN.BIENICI, {});
        // WAIT FOR JOBS TO COMPLETE
        await new Promise((resolve) => setTimeout(resolve, 6000));

        const completedJobs = await Promise.all((await queue.getCompleted()).map(async (job) => await handleCompletedJob(job)));
        const failedJobs = await Promise.all((await queue.getFailed()).map(async (job) => await handleFailedJob(job, new Error(job.failedReason))));
        expect(completedJobs.length).toEqual(2);
        expect(failedJobs.length).toEqual(1);
        expectTypeOf(completedJobs).toMatchTypeOf<(CrawlerStats | undefined)[]>
        expectTypeOf(failedJobs).toMatchTypeOf<(CrawlerStats | undefined)[]>
        await worker.close();
    });

    test.sequential('Handles Timeout Error Gracefully', { timeout: 40000 }, async () => {
        const worker = new Worker(queue.name, async (job) => {
            if (job.name === CRAWLER_ORIGIN.BONCOIN) return crawl(initTestCrawler(10000), ['https://www.google.com'], 12000);
            if (job.name === CRAWLER_ORIGIN.SELOGER) return crawl(initTestCrawler(15000), ['https://www.google.com'], 5000);
            if (job.name === CRAWLER_ORIGIN.BIENICI) return crawl(initTestCrawler(10000), ['https://www.google.com'], 5000);
            if (job.name === CRAWLER_ORIGIN.LOGICIMMO) return crawl(initTestCrawler(1000), ['https://www.google.com'], 500);
        }, { ...initRedis() });

        await queue.add(CRAWLER_ORIGIN.SELOGER, {});
        await queue.add(CRAWLER_ORIGIN.BONCOIN, {});
        await queue.add(CRAWLER_ORIGIN.BIENICI, {});
        await queue.add(CRAWLER_ORIGIN.LOGICIMMO, {});

        // WAIT FOR JOBS TO COMPLETE
        await new Promise((resolve) => setTimeout(resolve, 22000));

        const completedJobs = await Promise.all((await queue.getCompleted()).map(async (job) => await handleCompletedJob(job)));
        const failedJobs = await Promise.all((await queue.getFailed()).map(async (job) => await handleFailedJob(job, new Error(job.failedReason))));

        expect(completedJobs.length).toEqual(1);
        expect(failedJobs.length).toEqual(3);
        expectTypeOf(completedJobs).toMatchTypeOf<(CrawlerStats | undefined)[]>
        expectTypeOf(failedJobs).toMatchTypeOf<(CrawlerStats | undefined)[]>
        await worker.close();
    });

});


