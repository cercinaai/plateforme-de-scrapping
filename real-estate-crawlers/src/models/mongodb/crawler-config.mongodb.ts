import { Schema } from "mongoose";



const CrawlerConfigSchema = new Schema<CrawlerConfig>({
    can_crawl: { type: Boolean, required: true },
    proxy_urls: [{ type: String }],
    seloger_config: {
        url_prefix: { type: String, required: true },
        regions: [{
            name: { type: String, required: true },
            link: { type: String, required: true },
            limit: { type: Number, required: true }
        }]
    },
    boncoin_limits: {
        url_prefix: { type: String, required: true },
        regions: [{
            name: { type: String, required: true },
            link: { type: String, required: true },
            limit: { type: Number, required: true }
        }]
    },
    bienici_limits: {
        url_prefix: { type: String, required: true },
        regions: [{
            name: { type: String, required: true },
            link: { type: String, required: true },
            limit: { type: Number, required: true }
        }]
    },
    logicimmo_limits: {
        url_prefix: { type: String, required: true },
        regions: [{
            name: { type: String, required: true },
            link: { type: String, required: true },
            limit: { type: Number, required: true }
        }]
    }
})

export interface CrawlerConfig {
    can_crawl: boolean;
    proxy_urls: string[];
    seloger_config: {
        url_prefix: string,
        regions: Array<{ name: string, link: string, limit: number }>
    }
    boncoin_limits: {
        url_prefix: string,
        regions: Array<{ name: string, link: string, limit: number }>
    };
    bienici_limits: {
        url_prefix: string,
        regions: Array<{ name: string, link: string, limit: number }>
    };
    logicimmo_limits: {
        url_prefix: string,
        regions: Array<{ name: string, link: string, limit: number }>
    };
}