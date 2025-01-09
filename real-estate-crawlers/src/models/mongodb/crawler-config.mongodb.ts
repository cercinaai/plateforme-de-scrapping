import { model, Schema } from "mongoose";



const CrawlerConfigSchema = new Schema<CrawlerConfig>({
    can_crawl: { type: Boolean, required: true },
    api_key: { type: String, required: true },
    proxy_urls: [{ type: String }],
    seloger_config: {
        status: { type: String, default: "inactive" },
        total: { type: Number, required: true },
        regions: [{
            name: { type: String, required: true },
            link: [{ type: String, required: true }],
            limit: { type: Number, required: true }
        }]
    },
    boncoin_limits: {
        status: { type: String, default: "inactive" },
        total: { type: Number, required: true },
        regions: [{
            name: { type: String, required: true },
            link: { type: String, required: true },
            limit: { type: Number, required: true }
        }]
    },
    bienici_limits: {
        status: { type: String, default: "inactive" },
        total: { type: Number, required: true },
        regions: [{
            name: { type: String, required: true },
            link: { type: String, required: true },
            limit: { type: Number, required: true }
        }]
    },
    logicimmo_limits: {
        status: { type: String, default: "inactive" },
        total: { type: Number, required: true },
        regions: [{
            name: { type: String, required: true },
            link: { type: String, required: true },
            limit: { type: Number, required: true }
        }]
    },
    franceTravail_limits: {
        status: { type: String, default: "inactive", required: true },
        nombre: { type: Number, required: true },
        total: { type: Number, required: true },
        regions: [{
            name: { type: String, required: true },
            link: { type: String, required: true },
            limit: { type: Number, required: true }
        }]
    },
    leboncoinGolf_limits: {
        status: { type: String, default: "inactive" },
        total: { type: Number, required: true },
        regions: [{
          name: { type: String, required: true },
          link: { type: String, required: true },
          limit: { type: Number, required: true }
        }]
      },
})


export const CrawlerConfigModel = model<CrawlerConfig>('CrawlerConfig', CrawlerConfigSchema);

export interface CrawlerConfig {
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
    logicimmo_limits: {
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
    leboncoinGolf_limits: {
        status: string;
        total: number;
        regions: Array<{ name: string, link: string, limit: number }>
    };
   
}