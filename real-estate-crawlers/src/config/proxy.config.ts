import { CrawlerConfigModel } from "../models/mongodb/crawler-config.mongodb"

export const initProxy = async (): Promise<string[]> => {
    const crawlerConfig = await CrawlerConfigModel.findOne({});
    return crawlerConfig?.proxy_urls || [];
}