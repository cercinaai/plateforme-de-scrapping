import { model, Schema } from "mongoose";
import { CRAWLER_ORIGIN, CRAWLER_STATUS } from "../../utils/enum";


const CrawlerSessionSchema = new Schema<CrawlerSession>({
    session_date: { type: Date, required: true },
    crawlers_stats: [{
        origin: { type: String, required: true },
        status: { type: String, required: true },
        total_data_grabbed: { type: Number, required: true },
        started_at: { type: Date, required: true },
        finished_at: { type: Date, required: true },
        total_requests: { type: Number },
        success_requests: { type: Number },
        failed_requests: { type: Number },
        error: {
            screenshot: { type: String },
            failedReason: { type: String },
            failed_request_url: { type: String },
            proxy_used: { type: String }
        }
    }]
})

export const CrawlerSessionModel = model<CrawlerSession>('CrawlerSession', CrawlerSessionSchema);



export interface CrawlerSession {
    session_date: Date
    crawlers_stats: CrawlerStats[]
}

export interface CrawlerStats {
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

