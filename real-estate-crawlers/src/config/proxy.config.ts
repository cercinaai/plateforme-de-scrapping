import { getCrawlersConfig } from "./crawlers.config";

export const initProxy = async (): Promise<string[]> => {
    const crawlerConfig = await getCrawlersConfig();
    return crawlerConfig.proxy_urls;
}