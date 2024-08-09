import { Process, Processor } from "@nestjs/bull";
import { Logger, Scope } from "@nestjs/common";
import { DataProcessingService } from "src/data-processing/data-processing.service";
import { Job } from "bull";
import { FinalStatistics, PlaywrightCrawler, ProxyConfiguration } from "crawlee";
import { selogerConfig, selogerCrawlerOptions } from "./seloger.config";
import { ProxyService } from "../proxy.service";
import { Page } from "playwright";


@Processor({ name: 'crawler', scope: Scope.DEFAULT })
export class SelogerCrawler {

    private readonly logger = new Logger(SelogerCrawler.name)
    private readonly target_url: string = 'https://www.seloger.com/list.htm?projects=2,5&types=2,4,1,3,9,11,12,14,13,10&natures=1,2,4&sort=d_dt_crea&mandatorycommodities=0&enterprise=0&houseboat=1&qsVersion=1.0&m=search_refine-redirection-search_results';

    constructor(private dataProcessingService: DataProcessingService, private proxyService: ProxyService) { }

    @Process('seloger-crawler')
    async start(job: Job) {
        let check_date = new Date();
        let total_data_grabbed: number = job.data['total_data_grabbed'] || 0;
        let attempts_count: number = job.data['attempts_count'] || 0;
        let retrying_failed_request: string | null = job.data['failed_request_url'] || null;

        let crawler = new PlaywrightCrawler({
            ...selogerCrawlerOptions,
            // proxyConfiguration: new ProxyConfiguration({
            //     newUrlFunction: async () => this.proxyService.new_proxy()
            // }),
            requestHandler: async ({ page, enqueueLinks, closeCookieModals }) => {
                await closeCookieModals()
                const data = await page.evaluate(() => {
                    return Array.from(window['initialData']['cards']['list']).filter((card) => card['cardType'] === 'classified');
                });
                await this.dataProcessingService.process(data, 'seloger-crawler');
                total_data_grabbed += data.length;
                let next_button = await page.$('a[data-testid="gsl.uilib.Paging.nextButton"]');
                if (!next_button) return;
                await next_button.click();
                await page.waitForURL('https://www.seloger.com/**', { waitUntil: 'domcontentloaded' });
                await enqueueLinks({ urls: [page.url()] });
            },
            failedRequestHandler: async ({ request, proxyInfo }, error) => {
                await job.update({
                    job_id: job.id.toLocaleString(),
                    error_date: new Date(),
                    crawler_origin: 'seloger',
                    status: 'failed',
                    total_data_grabbed: total_data_grabbed,
                    attempts_count: attempts_count + 1,
                    failedReason: request.errorMessages[-1] || error.message || 'Unknown error',
                    failed_request_url: request.url || 'N/A',
                    proxy_used: proxyInfo ? proxyInfo.url : 'N/A',
                });
            }
        }, selogerConfig)

        let stat: FinalStatistics = await crawler.run([retrying_failed_request || this.target_url]);
        await crawler.teardown();
        if (stat.requestsFailed > 0 || stat.requestsTotal === 0 || stat.requestsFinished === 0) {
            await job.update({
                ...job.data,
                total_request: stat.requestsTotal,
                success_requests: stat.requestsFinished,
                failed_requests: stat.requestsFailed,
            });
            await job.moveToFailed(new Error(`Failed requests: ${stat.requestsFailed}`), false);
            return;
        }
        await job.update({
            success_date: new Date(),
            crawler_origin: 'seloger',
            status: 'success',
            total_data_grabbed: total_data_grabbed,
            total_request: stat.requestsTotal,
            attempts_count: attempts_count + 1,
            success_requests: stat.requestsFinished,
            failed_requests: stat.requestsFailed,
        });
    }
}