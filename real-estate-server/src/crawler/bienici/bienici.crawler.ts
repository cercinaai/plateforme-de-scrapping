import { Process, Processor } from "@nestjs/bull";
import { Logger, Scope } from "@nestjs/common";
import { DataProcessingService } from "src/data-processing/data-processing.service";
import { ProxyService } from "../proxy.service";
import { Job } from "bull";
import { bieniciConfig, bieniciCrawlerOption } from "./bienici.config";
import { PlaywrightCrawler, ProxyConfiguration } from "crawlee";
import { Page } from "playwright";


@Processor({ name: 'crawler', scope: Scope.DEFAULT })
export class BieniciCrawler {
    private readonly logger = new Logger(BieniciCrawler.name);

    constructor(private dataProcessingService: DataProcessingService, private proxyService: ProxyService) { }

    @Process('bienici-crawler')
    async start(job: Job) {
        let check_date = new Date();
        let crawler = new PlaywrightCrawler({
            ...bieniciCrawlerOption,
            preNavigationHooks: [
                async ({ page, waitForSelector }) => {
                    await page.route('https://www.bienici.com/realEstateAds**', async (route) => {
                        let res = await route.fetch();
                        let body = await res.json();
                        if (!body.realEstateAds || body.realEstateAds.length === 0) return;
                        let ads = body.realEstateAds;
                        await route.continue();
                        await page.evaluate((ads) => {
                            window['crawled_ads'] = ads;
                        }, ads);
                    });
                }
            ],
            requestHandler: async ({ waitForSelector, page, enqueueLinks, log, closeCookieModals }) => {
                const base_url = 'https://www.bienici.com';
                await closeCookieModals();
                await waitForSelector("#searchResults > div > div.resultsListContainer");
                let ads = await page.evaluate(() => window['crawled_ads']);
                let date_filter_content = Array.from(ads).filter((ad: any) => {
                    let ad_date = new Date(ad['publicationDate']);
                    return ad_date.getUTCFullYear() === check_date.getUTCFullYear() &&
                        ad_date.getUTCMonth() === check_date.getUTCMonth() &&
                        ad_date.getUTCDate() === check_date.getUTCDate();
                });
                if (date_filter_content.length === 0) {
                    this.logger.log("Found ads older than check_date. Stopping the crawler.");
                    return;
                }
                if (ads.length > date_filter_content.length) {
                    const formated_ads = await this.format_ads(date_filter_content, page);
                    await this.dataProcessingService.process(formated_ads, 'bienici-crawler');
                    return;
                };
                const format_ads = await this.format_ads(date_filter_content, page);
                await this.dataProcessingService.process(format_ads, 'bienici-crawler');
                await waitForSelector("#searchResultsContainer > div.vue-pagination.pagination > div.pagination__nav-buttons > a.pagination__go-forward-button");
                const next_page_html = await page.$("#searchResultsContainer > div.vue-pagination.pagination > div.pagination__nav-buttons > a.pagination__go-forward-button");
                const next_page = await next_page_html?.getAttribute('href');
                log.info(next_page || "NO NEXT PAGE");
                if (!next_page) return;
                await enqueueLinks({
                    urls: [`${base_url}${next_page}`],
                    label: 'next_page'
                });
            },
            failedRequestHandler: async ({ request, proxyInfo, log }, error) => {
                this.logger.error('Failed request', { request, proxyInfo, error });
                await job.moveToFailed(error, false);
            }
        }, bieniciConfig);
        await crawler.run(['https://www.bienici.com/recherche/achat/france/maisonvilla,appartement,parking,terrain,loft,commerce,batiment,chateau,local,bureau,hotel,autres?mode=liste&tri=publication-desc']);
        if (!crawler.requestQueue.isEmpty()) {
            await crawler.requestQueue.drop();
        }
        await crawler.teardown();
        if (job.isFailed()) return;
        await job.update({
            success_date: new Date(),
            crawler_origin: 'bienici',
            status: 'success',
            success_requests: crawler.stats.state.requestsFinished,
            failed_requests: crawler.stats.state.requestsFailed
        });
        await job.moveToCompleted("success", false);
    }


    private async format_ads(ads: any[], page: Page): Promise<any[]> {
        const base_url = 'https://www.bienici.com';
        return Promise.all(ads.map(async (ad: any) => {
            let ads_link_html = await page.$(`article[data-id="${ad.id}"]  a`);
            let ad_link = await ads_link_html?.getAttribute('href');
            return {
                ...ad,
                url: ad_link ? `${base_url}${ad_link}` : ''
            }
        }));
    }
}