import { Job } from "bull";
import { FinalStatistics } from "crawlee";

export const handleCrawlerState = async (job: Job, stat: FinalStatistics) => {
    if (job.data.error || stat.requestsTotal === 0) {
        await handleFailure(job, stat);
        return;
    }
    await handleSuccess(job, stat);
}

export const handleFailure = async (job: Job, stat: FinalStatistics) => {
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
        total_request: stat.requestsTotal,
        success_requests: stat.requestsFinished,
        failed_requests: stat.requestsFailed
    });
    await job.moveToFailed(job.data.error['failedReason']);
}

export const handleSuccess = async (job: Job, stat: FinalStatistics) => {
    await job.update({
        ...job.data,
        status: 'success',
        total_request: stat.requestsTotal,
        success_requests: stat.requestsFinished,
        failed_requests: stat.requestsFailed
    });
}