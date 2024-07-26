import { BrowserName, DeviceCategory, OperatingSystemsName, PlaywrightCrawler, ProxyConfiguration } from 'crawlee';
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Scope } from '@nestjs/common';
import { DataProcessingService } from 'src/data-processing/data-processing.service';
import { ConfigService } from '@nestjs/config';

@Processor({ name: 'crawler', scope: Scope.REQUEST })
export class BoncoinCrawler {
    private proxy_url: string = 'https://proxy.webshare.io/api/v2/proxy/list/?mode=backbone&page=2&page_size=1'

    constructor(private dataProcessingService: DataProcessingService, private configService: ConfigService) { }

    @Process('boncoin-crawler')
    async start(job: Job) {
        let crawler = new PlaywrightCrawler({
            useSessionPool: true,
            persistCookiesPerSession: true,
            maxRequestRetries: 3,
            maxSessionRotations: 3,
            retryOnBlocked: true,
            sameDomainDelaySecs: 0,
            proxyConfiguration: new ProxyConfiguration({
                newUrlFunction: async () => this.new_proxy()
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
            browserPoolOptions: {
                useFingerprints: true,
                fingerprintOptions: {
                    fingerprintGeneratorOptions: {
                        browsers: [{
                            name: BrowserName.chrome,
                            minVersion: 96,
                        }],
                        devices: [
                            DeviceCategory.desktop,
                        ],
                        operatingSystems: [
                            OperatingSystemsName.windows,
                        ],
                    },
                },
            },
            failedRequestHandler: async ({ request, proxyInfo, crawler }, error) => {
                await job.moveToFailed(error);
                let crawler_stat = crawler.stats.state;
                await job.update({
                    job_id: job.id.toLocaleString(),
                    error_date: new Date(),
                    crawler_origin: 'boncoin',
                    status: 'failed',
                    failedReason: error.message,
                    failed_request_url: request.url,
                    success_requests: crawler_stat.requestsFinished,
                    failed_requests: crawler_stat.requestsFailed,
                    proxy_used: proxyInfo.url
                });
            },
        });
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
        await job.moveToCompleted("success");
    }

    private async new_proxy(): Promise<string> {
        const url = new URL(this.proxy_url);
        const response = await fetch(url.href, {
            method: 'GET',
            headers: {
                'Authorization': `Token ${this.configService.get<string>('PROXY_API_KEY')}`
            }
        })
        let data = await response.json();
        this.proxy_url = data['next']
        return `http://${data.results[0].username}:${data.results[0].password}@p.webshare.io:${data.results[0].port}`
    }
}