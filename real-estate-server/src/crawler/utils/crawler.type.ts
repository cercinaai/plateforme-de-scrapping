
export type crawler_healthCheck_negative = {
    error_date: Date,
    crawler_origin: string,
    crawler_error: string[],
    request_url: string,
}
export type crawler_healthCheck_positive = {
    crawler_origin: string,
    last_checked: Date,
    request_url: string
}