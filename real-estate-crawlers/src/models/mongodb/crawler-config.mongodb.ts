import { model, Schema } from "mongoose";



const CrawlerConfigSchema = new Schema<CrawlerConfig>({
    can_crawl: { type: Boolean, required: true },
    api_key: { type: String, required: true },
    proxy_urls: [{ type: String }],
    seloger_config: {
        total: { type: Number, required: true },
        regions: [{
            name: { type: String, required: true },
            link: [{ type: String, required: true }],
            limit: { type: Number, required: true }
        }]
    },
    boncoin_limits: {
        total: { type: Number, required: true },
        regions: [{
            name: { type: String, required: true },
            link: { type: String, required: true },
            limit: { type: Number, required: true }
        }]
    },
    bienici_limits: {
        total: { type: Number, required: true },
        regions: [{
            name: { type: String, required: true },
            link: { type: String, required: true },
            limit: { type: Number, required: true }
        }]
    },
    logicimmo_limits: {
        total: { type: Number, required: true },
        regions: [{
            name: { type: String, required: true },
            link: { type: String, required: true },
            limit: { type: Number, required: true }
        }]
    }
})


export const CrawlerConfigModel = model<CrawlerConfig>('CrawlerConfig', CrawlerConfigSchema);

export interface CrawlerConfig {
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