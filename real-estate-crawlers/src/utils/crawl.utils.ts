import { CriticalError, FinalStatistics, PlaywrightCrawler } from "crawlee";

export const crawl = async (crawler: PlaywrightCrawler, links: string[], timeout: number = (3_600_000 * 8)): Promise<FinalStatistics> => {
    try {
        return Promise.race([crawler_timeout(timeout), (async () => {
            const statistics = await crawler.run(links);
            await crawler.requestQueue?.drop();
            await crawler.teardown();
            return statistics;
        })()])
    } catch (err) {
        if (err.message.includes('Crawler Reached Timeout. Stopping...')) {
            crawler.requestQueue?.drop();
            crawler.teardown();
            throw new CriticalError(err.message);
        }
        throw err;
    }
}


const crawler_timeout = (timeout: number): Promise<never> => {
    return new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Crawler Reached Timeout. Stopping...')), timeout);
    });
}