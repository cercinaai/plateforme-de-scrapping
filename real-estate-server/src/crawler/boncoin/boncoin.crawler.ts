import { PlaywrightCrawler, ProxyConfiguration } from 'crawlee';
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Inject, Logger, Scope } from '@nestjs/common';
import { DataProcessingService } from 'src/data-processing/data-processing.service';
import { boncoinConfig, boncoinCrawlerOption } from './boncoin.config';
import { ProxyService } from '../proxy.service';

@Processor({ name: 'crawler', scope: Scope.DEFAULT })
export class BoncoinCrawler {
    private readonly logger = new Logger(BoncoinCrawler.name);

    constructor(private dataProcessingService: DataProcessingService, private proxyService: ProxyService) { }

    @Process('boncoin-crawler')
    async full_data_crawler(job: Job) {
        let check_date = new Date();
        let crawler = new PlaywrightCrawler({
            ...boncoinCrawlerOption,
            proxyConfiguration: new ProxyConfiguration({
                newUrlFunction: async () => this.proxyService.new_proxy()
            }),
            requestHandler: async ({ waitForSelector, page, enqueueLinks, log }) => {
                const base_url = 'https://www.leboncoin.fr';
                await waitForSelector("script[id='__NEXT_DATA__']");
                let data = await page.$("script[id='__NEXT_DATA__']");
                let json_content = JSON.parse(await data?.textContent() as string)["props"]["pageProps"]["searchData"]["ads"];
                let date_filter_content = Array.from(json_content).filter((ad: any) => {
                    let ad_date = new Date(ad['first_publication_date']);
                    return ad_date.getUTCFullYear() === check_date.getUTCFullYear() &&
                        ad_date.getUTCMonth() === check_date.getUTCMonth() &&
                        ad_date.getUTCDate() === check_date.getUTCDate();
                });
                await this.dataProcessingService.process(date_filter_content, 'boncoin-crawler');
                if (json_content.length > date_filter_content.length || date_filter_content.length === 0) {
                    this.logger.log("Found ads older than check_date. Stopping the crawler.");
                    return;
                };
                await waitForSelector("a[title='Page suivante']");
                const next_page_html = await page.$('a[title="Page suivante"]');
                const next_page = await next_page_html?.getAttribute('href');
                log.info(next_page || "NO NEXT PAGE");
                if (!next_page) return;
                await enqueueLinks({
                    urls: [`${base_url}${next_page}`],
                    label: 'next_page'
                });
            },

            failedRequestHandler: async ({ request, proxyInfo }, error) => {
                this.logger.error('Failed request', { request, proxyInfo, error });
                await job.moveToFailed(error, false);
            },
        }, boncoinConfig);

        await crawler.run(['https://www.leboncoin.fr/recherche?category=9&owner_type=pro']);
        if (!crawler.requestQueue.isEmpty()) {
            await crawler.requestQueue.drop();
        }
        await crawler.teardown();
        if (job.isFailed()) return;
        await job.update({
            success_date: new Date(),
            crawler_origin: 'boncoin',
            status: 'success',
            success_requests: crawler.stats.state.requestsFinished,
            failed_requests: crawler.stats.state.requestsFailed
        });
        await job.moveToCompleted("success", false);
    }


}