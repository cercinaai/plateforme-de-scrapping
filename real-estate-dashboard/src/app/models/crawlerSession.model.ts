export type CrawlerStats = {
    success_date?: Date;
    error_date?: Date;
    crawler_origin: string;
    status: string;
    total_data_grabbed: number;
    total_request?: number;
    success_requests?: number;
    failed_requests?: number;
    failedReason?: string;
    attempts_count?: number;
    failed_request_url?: string;
    proxy_used?: string;
};

export type CrawlerSession = {
    _id: string;
    session_date: Date;
    bienici: CrawlerStats;
    logicimmo: CrawlerStats;
    seloger: CrawlerStats;
    boncoin: CrawlerStats;
};