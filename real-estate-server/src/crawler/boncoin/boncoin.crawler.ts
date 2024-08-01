import { FinalStatistics, PlaywrightCrawler, ProxyConfiguration } from 'crawlee';
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Inject, Logger, Scope } from '@nestjs/common';
import { DataProcessingService } from 'src/data-processing/data-processing.service';
import { boncoinConfig, boncoinCrawlerOption } from './boncoin.config';
import { ProxyService } from '../proxy.service';
import { Page } from 'playwright';

@Processor({ name: 'crawler', scope: Scope.DEFAULT })
export class BoncoinCrawler {

    private readonly logger = new Logger(BoncoinCrawler.name);
    private readonly target_url: string[] = ['https://www.leboncoin.fr/recherche?category=9&owner_type=pro'];
    constructor(private dataProcessingService: DataProcessingService, private proxyService: ProxyService) { }

    @Process('boncoin-crawler')
    async full_data_crawler(job: Job) {
        let page_number = 1;
        let check_date = new Date();
        // const initial_proxy_list = await this.proxyService.get_fresh_proxy_list();
        let crawler = new PlaywrightCrawler({
            ...boncoinCrawlerOption,
            proxyConfiguration: new ProxyConfiguration({
                // proxyUrls: initial_proxy_list,
                newUrlFunction: async () => this.proxyService.new_proxy()
            }),
            requestHandler: async ({ waitForSelector, page, enqueueLinks, closeCookieModals }) => {
                const base_url = 'https://www.leboncoin.fr';
                if (page_number === 1) {
                    await closeCookieModals();
                }
                let data = await page.$("script[id='__NEXT_DATA__']");
                let ads = JSON.parse(await data?.textContent() as string)["props"]["pageProps"]["searchData"]["ads"];
                let date_filter_content = Array.from(ads).filter((ad: any) => {
                    let ad_date = new Date(ad['first_publication_date']);
                    return ad_date.getUTCFullYear() === check_date.getUTCFullYear() &&
                        ad_date.getUTCMonth() === check_date.getUTCMonth() &&
                        ad_date.getUTCDate() === check_date.getUTCDate();
                });
                if (date_filter_content.length === 0) {
                    this.logger.log("Found ads older than check_date. Stopping the crawler.");
                    return;
                }
                if (ads.length > date_filter_content.length) {
                    console.log(ads.map((ad: any) => ad['first_publication_date']), date_filter_content.map((ad: any) => ad['first_publication_date']));
                    this.logger.log("Found ads older than check_date. Stopping the crawler.");
                    await this.dataProcessingService.process(date_filter_content, 'boncoin-crawler');
                    return;
                };
                await this.dataProcessingService.process(date_filter_content, 'boncoin-crawler');
                await waitForSelector("a[title='Page suivante']");
                const next_page_html = await page.$('a[title="Page suivante"]');
                const next_page = await next_page_html?.getAttribute('href');
                if (!next_page) return;
                page_number++;
                await enqueueLinks({
                    urls: [`${base_url}${next_page}`],
                    label: 'next_page'
                });
            },
            failedRequestHandler: async ({ request, proxyInfo }, error) => {
                await job.update({
                    job_id: job.id.toLocaleString(),
                    error_date: new Date(),
                    crawler_origin: 'boncoin',
                    status: 'failed',
                    failedReason: request.errorMessages[-1] || error.message || 'Unknown error',
                    failed_request_url: request.url,
                    proxy_used: proxyInfo.url
                });
            }
        }, boncoinConfig);

        let stat: FinalStatistics = await crawler.run(this.target_url);
        await crawler.teardown();
        if (stat.requestsFailed > 0) {
            await job.moveToFailed(new Error(`Failed requests: ${stat.requestsFailed}`), false);
            return;
        }
        await job.update({
            success_date: new Date(),
            crawler_origin: 'boncoin',
            status: 'success',
            total_request: stat.requestsTotal,
            success_requests: stat.requestsFinished,
            failed_requests: stat.requestsFailed,
        });
    }
}