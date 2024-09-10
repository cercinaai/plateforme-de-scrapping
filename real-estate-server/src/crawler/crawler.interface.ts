import { Job } from "bull";
import { FinalStatistics, PlaywrightCrawler, PlaywrightCrawlingContext } from "crawlee";

export interface CrawlerInterface {
    crawl(job: Job): Promise<FinalStatistics>;
    configureCrawler(job: Job): Promise<PlaywrightCrawler>;
    initialize(job: Job): Promise<void>;
    handleCrawlerError(error: Error, job: Job, ctx: PlaywrightCrawlingContext): Promise<void>;
}