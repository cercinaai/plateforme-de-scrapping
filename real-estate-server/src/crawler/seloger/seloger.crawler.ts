import { Process, Processor } from "@nestjs/bull";
import { Scope } from "@nestjs/common";
import { DataProcessingService } from "src/data-processing/data-processing.service";
import { Job } from "bull";
import { PlaywrightCrawler, ProxyConfiguration } from "crawlee";
import { selogerConfig, selogerCrawlerOptions } from "./seloger.config";
import { ProxyService } from "../proxy.service";
import { Page } from "playwright";


@Processor({ name: 'crawler', scope: Scope.REQUEST })
export class SelogerCrawler {


    constructor(private dataProcessingService: DataProcessingService, private proxyService: ProxyService) { }

    @Process('seloger-crawler')
    async start(job: Job) {
        let crawler = new PlaywrightCrawler({
            ...selogerCrawlerOptions,
            proxyConfiguration: new ProxyConfiguration({
                newUrlFunction: async () => this.proxyService.new_proxy()
            }),
            requestHandler: async ({ request, waitForSelector, page, enqueueLinks, log, crawler, closeCookieModals }) => {
                await closeCookieModals()
                await this.go_to_buy_page(page, waitForSelector);
                // const data = await page.evaluate(() => {
                //     return Array.from(window['initialData']['cards']['list']).filter((card) => card['cardType'] === 'classified');
                // });
                // await this.dataProcessingService.process(data, 'seloger-crawler');
                // let next_button = await page.$('a[data-testid="gsl.uilib.Paging.nextButton"]');
                // if (!next_button) return;
                // await next_button.click();
                // await page.waitForURL('https://www.seloger.com/**', { waitUntil: 'domcontentloaded' });
                // await enqueueLinks({ urls: [page.url()] });
            },
            errorHandler: async ({ request, proxyInfo, crawler, log }, error) => {
                log.info(`Failed request: ${request.url}`);
            },
            failedRequestHandler: async ({ request, proxyInfo, crawler, log }, error) => {
                await job.moveToFailed(error, false);
                let crawler_stat = crawler.stats.state;
                await job.update({
                    job_id: job.id.toLocaleString(),
                    error_date: new Date(),
                    crawler_origin: 'seloger',
                    status: 'failed',
                    failedReason: error.message,
                    failed_request_url: request.url,
                    success_requests: crawler_stat.requestsFinished,
                    failed_requests: crawler_stat.requestsFailed,
                    proxy_used: proxyInfo.url
                });
            }
        }, selogerConfig)

        await crawler.run(['https://www.seloger.com']);
        if (!crawler.requestQueue.isEmpty()) {
            await crawler.requestQueue.drop();
        }
        await crawler.teardown();
        if (job.isFailed()) return;
        await job.update({
            success_date: new Date(),
            crawler_origin: 'seloger',
            status: 'success',
            success_requests: crawler.stats.state.requestsFinished,
            failed_requests: crawler.stats.state.requestsFailed
        });
        await job.moveToCompleted("success");
    }

    async go_to_buy_page(page: Page, waitForSelector: Function) {
        await waitForSelector('#i-head > div.c-header-list-container > ul > li:nth-child(1) > div > a');
        let sell_button = await page.$('#i-head > div.c-header-list-container > ul > li:nth-child(1) > div > a');
        await sell_button.click();
        await page.waitForURL('https://www.seloger.com/**', { waitUntil: 'domcontentloaded' });
        let localite_button = await page.$("div[data-testid='gsl.agatha.location.localities']");
        let add_filter_button = await page.$("div[data-testid='gsl.uilib.Button']");
        await localite_button.click();
        await add_filter_button.click();
        await page.waitForTimeout(2000);
        await page.evaluate(() => {
            Array.from(document.querySelectorAll("div[id^='natures-']")).slice(2, 0).map((d) => d.querySelector('input').click());
        })
        let applyButton = await page.$("button[data-testid='gsl.agatha.apply_btn']");
        await applyButton.click();
        await page.waitForURL('https://www.seloger.com/**', { waitUntil: 'domcontentloaded' });
    }
}