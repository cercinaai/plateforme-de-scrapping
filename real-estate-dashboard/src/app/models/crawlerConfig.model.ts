export type CrawlerConfig = {
    can_crawl: boolean;
    proxy_urls: string[];
    api_key: string;
    seloger_config: {
        status: string;
        total: number;
        regions: Array<{ name: string, link: string[], limit: number }>
    }
    boncoin_limits: {
        status: string;
        total: number;
        regions: Array<{ name: string, link: string, limit: number }>
    };
    bienici_limits: {
        status: string;
        total: number;
        regions: Array<{ name: string, link: string, limit: number }>
    };
    franceTravail_limits: {
        status: string;
        nombre: number;
        total: number;
        regions: Array<{ name: string, link: string, limit: number }>
    };
    logicimmo_limits: {
        status: string;
        total: number;
        regions: Array<{ name: string, link: string, limit: number }>
    };
}
