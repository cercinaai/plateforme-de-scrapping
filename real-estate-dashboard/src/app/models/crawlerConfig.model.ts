export type CrawlerConfig = {
    can_crawl: boolean;
    proxy_urls: string[];
    api_key: string;
    seloger_config: {
        total: number;
        regions: Array<{ name: string, link: string[], limit: number }>
    }
    boncoin_limits: {
        total: number;
        regions: Array<{ name: string, link: string, limit: number }>
    };
    bienici_limits: {
        total: number;
        regions: Array<{ name: string, link: string, limit: number }>
    };
    logicimmo_limits: {
        total: number;
        regions: Array<{ name: string, link: string, limit: number }>
    };
}
