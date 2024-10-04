import { CRAWLER_ORIGIN, CRAWLER_STATUS } from "../utils/enum";

export type CrawlerStats = {
    origin: CRAWLER_ORIGIN,
    status: CRAWLER_STATUS,
    total_data_grabbed: number,
    started_at: Date,
    finished_at: Date,
    total_requests?: number;
    success_requests?: number;
    failed_requests?: number;
    error?: {
        screenshot: string,
        failedReason: string,
        failed_request_url: string,
        proxy_used: string
    }
}


export interface CrawlerSession {
    session_date: Date
    crawlers_stats: CrawlerStats[]
}
