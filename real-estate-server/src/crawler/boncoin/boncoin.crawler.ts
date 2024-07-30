import { PlaywrightCrawler, ProxyConfiguration } from 'crawlee';
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Inject, Scope } from '@nestjs/common';
import { DataProcessingService } from 'src/data-processing/data-processing.service';
import { boncoinConfig, boncoinCrawlerOption } from './boncoin.config';
import { ProxyService } from '../proxy.service';

@Processor({ name: 'crawler', scope: Scope.DEFAULT })
export class BoncoinCrawler {

    constructor(private dataProcessingService: DataProcessingService, private proxyService: ProxyService) { }

    @Process('boncoin-crawler')
    async start(job: Job) {
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
                await this.dataProcessingService.process(json_content, 'boncoin-crawler');
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

            failedRequestHandler: async ({ request, proxyInfo, log }, error) => {
                log.error('Failed request', { request, proxyInfo, error });
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