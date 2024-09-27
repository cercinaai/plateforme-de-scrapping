import { Queue, Worker } from 'bullmq';
import { expect, test, describe, afterAll, afterEach, } from 'vitest';
import { initRedis } from '../src/config/redis.config';
import { handleCompletedJob, handleFailedJob, handleQueueUnexpectedError } from '../src/utils/handleCrawlerState.util';
import { CRAWLER_ORIGIN } from '../src/utils/enum';
import { config } from 'dotenv';
import { existsSync, mkdirSync } from 'fs'


describe('Crawler Real-Time Error Handling', () => {
    config();
    let queue = new Queue('test_error_handling', initRedis());
    let worker = new Worker('test_error_handling', async (job) => {
        if (job.data.shouldFailNonCritical) {
            if (job.name === CRAWLER_ORIGIN.BONCOIN) throw new Error('Non Critical Error');
            return { requestsTotal: 50, requestsFinished: 50, requestsFailed: 0 };
        }
        if (job.data.shouldFailCritical) {
            // LONG RUNNING PROCESS
            new Promise((resolve, reject) => {
                reject(new Error('This is an unhandled rejection'));
            });
        }
    }, initRedis());

    afterEach(async () => {
        worker.removeAllListeners();
        queue.removeAllListeners();
        const jobs = await queue.getJobs(['completed', 'failed',]);
        await Promise.all(jobs.map(async (job) => await job.remove()));
    });

    afterAll(async () => {
        await queue.close();
        await worker.close();
    });

    test('Handles non-critical failure gracefully and continues with next job', { timeout: 10000 }, async () => {
        // SETTING THE WORKER FOR THE QUEUE
        worker.on('failed', async (job, error) => {
            await handleFailedJob(job, error);
            const log_err = job?.data;
            expect(log_err).toEqual({
                status: 'failed',
                started_at: expect.any(Date),
                finished_at: expect.any(Date),
                total_data_grabbed: expect.any(Number),
                error: {
                    screenshot: expect.any(String),
                    failedReason: expect.any(String),
                    failed_request_url: expect.any(String),
                    proxy_used: expect.any(String),
                },
            });
        });
        worker.on('completed', async (job) => {
            await handleCompletedJob(job);
            const success_data = job.data;
            expect(success_data).toEqual({
                status: expect.any(String),
                started_at: expect.any(Date),
                finished_at: expect.any(Date),
                total_data_grabbed: expect.any(Number),
                total_requests: expect.any(Number),
                success_requests: expect.any(Number),
                failed_requests: expect.any(Number),
                error: expect.any(Object) || expect.any(null),
            });
        });

        await queue.add(CRAWLER_ORIGIN.SELOGER, { shouldFailNonCritical: true });
        await queue.add(CRAWLER_ORIGIN.BONCOIN, { shouldFailNonCritical: true });
        await queue.add(CRAWLER_ORIGIN.BIENICI, { shouldFailNonCritical: true });
    });

    test('Handles critical failure with process interruption', { timeout: 20000 }, async () => {
        // CREATE A STORAGE FOLDER FOR REQUEST QUEUES TO TEST THE ERROR HANDLING
        const requestQueuePath = './storage/request_queues';
        if (!existsSync(requestQueuePath)) {
            mkdirSync(requestQueuePath, { recursive: true });
        }
        // LISTEN FOR UNEXPECTED ERRORS
        process.on('unhandledRejection', async (err) => {
            expect(handleQueueUnexpectedError('unhandledRejection', err)).toBeCalled();
        });
        process.on('uncaughtException', async (err) => {
            expect(handleQueueUnexpectedError('uncaughtException', err)).toBeCalled();
        });

        queue.add(CRAWLER_ORIGIN.SELOGER, { shouldFailCritical: true });
        queue.add(CRAWLER_ORIGIN.BONCOIN, { shouldFailCritical: true });
        queue.add(CRAWLER_ORIGIN.BIENICI, { shouldFailCritical: true });
    });
});