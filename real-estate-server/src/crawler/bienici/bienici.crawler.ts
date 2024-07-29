import { Process, Processor } from "@nestjs/bull";
import { Scope } from "@nestjs/common";
import { DataProcessingService } from "src/data-processing/data-processing.service";
import { ProxyService } from "../proxy.service";
import { Job } from "bull";
import { bieniciConfig, bieniciCrawlerOption } from "./bienici.config";
import { PlaywrightCrawler, ProxyConfiguration } from "crawlee";


@Processor({ name: 'crawler', scope: Scope.DEFAULT })
export class BieniciCrawler {
    constructor(private dataProcessingService: DataProcessingService, private proxyService: ProxyService) { }

    @Process('bienici-crawler')
    async start(job: Job) {

        let crawler = new PlaywrightCrawler({
            ...bieniciCrawlerOption,
            // proxyConfiguration: new ProxyConfiguration({
            //     newUrlFunction: async () => this.proxyService.new_proxy()
            // }),
            preNavigationHooks: [
                async ({ page }) => {
                    await page.route('https://www.bienici.com/realEstateAds**', async (route) => {
                        let res = await route.fetch();
                        let body = await res.json();
                        if (!body.realEstateAds || body.realEstateAds.length === 0) return;
                        await this.dataProcessingService.process(body.realEstateAds, 'bienici-crawler');
                        await route.continue();
                    });
                }
            ],
            requestHandler: async ({ waitForSelector, page, enqueueLinks, log, closeCookieModals }) => {
                const base_url = 'https://www.bienici.com';
                await closeCookieModals();
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
            failedRequestHandler: async ({ request, proxyInfo, crawler, log }, error) => {
                log.error('Failed request', { request, proxyInfo, error });
                await job.moveToFailed(error);
            }
        }, bieniciConfig);
        await crawler.run(['https://www.bienici.com/recherche/achat/france/maisonvilla,appartement,parking,terrain,loft,commerce,batiment,chateau,local,bureau,hotel,autres']);
        if (!crawler.requestQueue.isEmpty()) {
            await crawler.requestQueue.drop();
        }
        await crawler.teardown();
        await job.update({
            success_date: new Date(),
            crawler_origin: 'bienici',
            status: 'success',
            success_requests: crawler.stats.state.requestsFinished,
            failed_requests: crawler.stats.state.requestsFailed
        });
        await job.moveToCompleted("success");
    }
}