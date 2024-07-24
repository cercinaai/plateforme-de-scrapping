
export type crawler_healthCheck_negative = {
    job_id: string,
    error_date: Date,
    crawler_origin: string,
    status: 'success' | 'failed',
    failedReason: string,
    failed_request_url: string,
    success_requests: number,
    failed_requests: number,
    proxy_used: string
}
export type crawler_healthCheck_positive = {
    success_date: Date,
    crawler_origin: string,
    status: 'success' | 'failed',
    success_requests: number,
    failed_requests: number
}