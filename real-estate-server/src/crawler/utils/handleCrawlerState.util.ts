import { Job } from "bull";
import { FinalStatistics, PlaywrightCrawlingContext } from "crawlee";
import { CrawlerSessionDocument } from "src/models/crawlerSession.schema";

export const handleCrawlerState = async (job: Job, stat: FinalStatistics): Promise<CrawlerSessionDocument> => {
    if (job.data.error || stat.requestsTotal === 0) {
        return handleFailure(job, stat) as Promise<CrawlerSessionDocument>;
    }
    return handleSuccess(job, stat) as Promise<CrawlerSessionDocument>;
}

export const handleCrawlerError = async (error: Error, job: Job, ctx: PlaywrightCrawlingContext) => {
    const { request, proxyInfo } = ctx;
    await job.update({
        ...job.data,
        status: 'failed',
        error: {
            failed_date: new Date(),
            failedReason: request.errorMessages[-1] || error.message || 'Unknown error',
            failed_request_url: request.url || 'N/A',
            proxy_used: proxyInfo ? proxyInfo.url : 'N/A',
        }
    })
}



const handleFailure = async (job: Job, stat: FinalStatistics): Promise<Partial<CrawlerSessionDocument>> => {
    if (stat.requestsTotal === 0 && !job.data.error) {
        return {
            status: 'failed',
            total_data_grabbed: job.data.total_data_grabbed,
            total_request: stat.requestsTotal,
            success_requests: stat.requestsFinished,
            failed_requests: stat.requestsFailed,
            error: {
                failed_date: new Date(),
                failedReason: 'Crawler did not start as expected',
                failed_request_url: 'N/A',
                proxy_used: 'N/A'
            }
        }
    }
    return {
        status: 'failed',
        total_data_grabbed: job.data.total_data_grabbed,
        total_request: stat.requestsTotal,
        success_requests: stat.requestsFinished,
        failed_requests: stat.requestsFailed,
        error: job.data.error
    }
}

const handleSuccess = async (job: Job, stat: FinalStatistics): Promise<Partial<CrawlerSessionDocument>> => {
    return {
        status: 'success',
        total_data_grabbed: job.data.total_data_grabbed,
        total_request: stat.requestsTotal,
        success_requests: stat.requestsFinished,
        failed_requests: stat.requestsFailed,
    }
}


