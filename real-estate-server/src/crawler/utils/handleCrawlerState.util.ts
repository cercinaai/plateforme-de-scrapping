import { Job } from "bull";
import { FinalStatistics, PlaywrightCrawlingContext } from "crawlee";
import { CRAWLER_ORIGIN } from "./enum";

export const handleCrawlerState = async (job: Job, stat: FinalStatistics) => {
    if (job.data.error || stat.requestsTotal === 0) {
        await handleFailure(job, stat);
        return;
    }
    await handleSuccess(job, stat);
}

export const handleCrawlerError = async (error: Error, job: Job, ctx: PlaywrightCrawlingContext) => {
    const { request, proxyInfo } = ctx;
    await job.update({
        ...job.data,
        attempts_count: job.data['attempts_count'] + 1,
        status: 'failed',
        error: {
            failed_date: new Date(),
            failedReason: request.errorMessages[-1] || error.message || 'Unknown error',
            failed_request_url: request.url || 'N/A',
            proxy_used: proxyInfo ? proxyInfo.url : 'N/A',
        }
    })
}

export const generateTimeoutCrawlerError = async (job: Job, origin?: CRAWLER_ORIGIN) => {
    await job.update({
        ...job.data,
        crawler_origin: origin || job.data.crawler_origin,
        total_data_grabbed: job.data.total_data_grabbed || 0,
        status: 'failed',
        error: {
            failed_date: new Date(),
            failedReason: 'Timeout reached',
            failed_request_url: 'N/A',
            proxy_used: 'N/A'
        }
    })
    await job.moveToFailed({ message: 'Timeout reached' });
}

const handleFailure = async (job: Job, stat: FinalStatistics) => {
    if (stat.requestsTotal === 0 && !job.data.error) {
        await job.update({
            ...job.data,
            total_request: stat.requestsTotal,
            success_requests: stat.requestsFinished,
            failed_requests: stat.requestsFailed,
            attempts_count: job.data.attempts_count + 1,
            status: 'failed',
            error: {
                failed_date: new Date(),
                failedReason: 'Crawler did not start as expected',
                failed_request_url: 'N/A',
                proxy_used: 'N/A'
            }
        });
        await job.moveToFailed({ message: 'Crawler did not start as expected' });
        return;
    }
    await job.update({
        ...job.data,
        attempts_count: job.data.attempts_count + 1,
        total_request: stat.requestsTotal,
        success_requests: stat.requestsFinished,
        failed_requests: stat.requestsFailed
    });
    await job.moveToFailed(job.data.error['failedReason']);
}

const handleSuccess = async (job: Job, stat: FinalStatistics) => {
    await job.update({
        ...job.data,
        status: 'success',
        total_request: stat.requestsTotal,
        success_requests: stat.requestsFinished,
        failed_requests: stat.requestsFailed
    });
}


