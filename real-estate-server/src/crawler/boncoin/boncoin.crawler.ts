import { FinalStatistics, PlaywrightCrawler, ProxyConfiguration, RequestQueue } from 'crawlee';
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Inject, Logger, Scope } from '@nestjs/common';
import { DataProcessingService } from 'src/data-processing/data-processing.service';
import { boncoinConfig, boncoinCrawlerOption } from './boncoin.config';
import { ProxyService } from '../proxy.service';
import { Page } from 'playwright';
import { chromium } from 'playwright-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import RecaptchaPlugin from 'puppeteer-extra-plugin-recaptcha';
import { ConfigService } from '@nestjs/config';

@Processor({ name: 'crawler', scope: Scope.DEFAULT })
export class BoncoinCrawler {

    private readonly logger = new Logger(BoncoinCrawler.name);
    private readonly target_url: string = 'https://www.leboncoin.fr/recherche?category=9&owner_type=pro';

    constructor(private dataProcessingService: DataProcessingService, private proxyService: ProxyService, private configService: ConfigService) { }

    @Process('boncoin-crawler')
    async full_data_crawler(job: Job) {
        // Reset job data
        await job.update({
            ...job.data,
            total_data_grabbed: 0,
            attempts_count: 0
        });

        // Run proxy crawler
        const proxy_stat = await this.runCrawler(job, this._configure_crawler_proxy);

        // Check if the job has failed
        if (!this.isJobFailed(job)) {
            await this.updateJobSuccess(job, proxy_stat);
            return;
        }

        const specificErrorRegex = /Detected a session error, rotating session/;
        if (!specificErrorRegex.test(job.data['failedReason'])) {
            await this.updateJobFailure(job, proxy_stat);
            return;
        }

        // Run captcha solving crawler
        this.logger.log('Bot Blocked, rerunning with CAPTCHA solving.');
        const captcha_stat = await this.runCrawler(job, this._configure_crawler_recaptcha, job.data['failed_request_url']);

        if (!this.isJobFailed(job)) {
            await this.updateJobSuccess(job, proxy_stat, captcha_stat);
            return;
        }

        await this.updateJobFailure(job, proxy_stat, captcha_stat)
    }
    private async runCrawler(job: Job, configureCrawlerFn: (job: Job) => Promise<PlaywrightCrawler>, url: string = this.target_url): Promise<FinalStatistics> {
        const crawler = await configureCrawlerFn.call(this, job);
        const stat: FinalStatistics = await crawler.run([url]);
        await crawler.requestQueue.drop();
        await crawler.teardown();
        return stat;
    }
    private isJobFailed(job: Job): boolean {
        return job.data['status'] && job.data['status'] === 'failed';
    }

    private async updateJobSuccess(job: Job, ...stats: FinalStatistics[]) {
        const totalStats = this.aggregateStats(stats);
        await job.update({
            ...job.data,
            success_date: new Date(),
            crawler_origin: 'boncoin',
            status: 'success',
            ...totalStats
        });
    }
    private async updateJobFailure(job: Job, ...stats: FinalStatistics[]) {
        const totalStats = this.aggregateStats(stats);
        await job.update({
            ...job.data,
            ...totalStats
        });
        await job.moveToFailed(job.data['failedReason'], false);
    }

    private aggregateStats(stats: FinalStatistics[]): any {
        return stats.reduce((acc, stat) => {
            acc.total_request += stat.requestsTotal;
            acc.success_requests += stat.requestsFinished;
            acc.failed_requests += stat.requestsFailed;
            return acc;
        }, { total_request: 0, success_requests: 0, failed_requests: 0 });
    }
    private async _configure_crawler_proxy(job: Job): Promise<PlaywrightCrawler> {
        const proxy_crawler_queue = await RequestQueue.open('proxy_crawler_queue');
        let check_date = new Date();
        return new PlaywrightCrawler({
            ...boncoinCrawlerOption,
            launchContext: {
                launcher: chromium.use(stealthPlugin())
            },
            requestQueue: proxy_crawler_queue,
            retryOnBlocked: true,
            // proxyConfiguration: new ProxyConfiguration({
            //     newUrlFunction: async () => this.proxyService.new_proxy()
            // }),
            requestHandler: async ({ waitForSelector, page, enqueueLinks, closeCookieModals }) => {
                await closeCookieModals();
                const base_url = 'https://www.leboncoin.fr';
                let data = await page.$("script[id='__NEXT_DATA__']");
                let ads = JSON.parse(await data?.textContent() as string)["props"]["pageProps"]["searchData"]["ads"];
                let date_filter_content = Array.from(ads).filter((ad: any) => {
                    let ad_date = new Date(ad['index_date']);
                    return ad_date.getUTCFullYear() === check_date.getUTCFullYear() &&
                        ad_date.getUTCMonth() === check_date.getUTCMonth() &&
                        ad_date.getUTCDate() === check_date.getUTCDate();
                });
                if (date_filter_content.length === 0) {
                    this.logger.log("Found ads older than check_date. Stopping the crawler.");
                    return;
                }
                if (ads.length > date_filter_content.length) {
                    this.logger.log("Found ads older than check_date. Stopping the crawler.");
                    await this.dataProcessingService.process(date_filter_content, 'boncoin-crawler');
                    job.update({
                        ...job.data,
                        total_data_grabbed: job.data['total_data_grabbed'] + date_filter_content.length
                    });
                    return;
                };
                await this.dataProcessingService.process(date_filter_content, 'boncoin-crawler');
                job.update({
                    ...job.data,
                    total_data_grabbed: job.data['total_data_grabbed'] + date_filter_content.length
                })
                await waitForSelector("a[title='Page suivante']");
                const next_page_html = await page.$('a[title="Page suivante"]');
                const next_page = await next_page_html?.getAttribute('href');
                if (!next_page) return;
                await enqueueLinks({
                    urls: [`${base_url}${next_page}`],
                    label: 'next_page'
                });
            },
            failedRequestHandler: async ({ request, proxyInfo }, error) => {
                await job.update({
                    ...job.data,
                    job_id: job.id.toLocaleString(),
                    error_date: new Date(),
                    crawler_origin: 'boncoin',
                    status: 'failed',
                    attempts_count: job.data['attempts_count'] + 1,
                    failedReason: request.errorMessages[-1] || error.message || 'Unknown error',
                    failed_request_url: request.url || 'N/A',
                    proxy_used: proxyInfo ? proxyInfo.url : 'N/A',
                });
            }
        }, boncoinConfig);

    }
    private async _configure_crawler_recaptcha(job: Job): Promise<PlaywrightCrawler> {
        const captcha_crawler_queue = await RequestQueue.open('captcha_crawler_queue');
        let check_date = new Date();
        return new PlaywrightCrawler({
            ...boncoinCrawlerOption,
            launchContext: {
                launcher: chromium.use(stealthPlugin()).use(RecaptchaPlugin({
                    provider: {
                        id: '2captcha', token: this.configService.get<string>('CAPTCHA_TOKEN'),
                    },
                })),
            },
            retryOnBlocked: false,
            requestQueue: captcha_crawler_queue,
            // proxyConfiguration: new ProxyConfiguration({
            //     newUrlFunction: async () => this.proxyService.new_proxy()
            // }),
            requestHandler: async ({ waitForSelector, page, enqueueLinks, closeCookieModals }) => {
                await closeCookieModals();
                const base_url = 'https://www.leboncoin.fr';
                let data = await page.$("script[id='__NEXT_DATA__']");
                let ads = JSON.parse(await data?.textContent() as string)["props"]["pageProps"]["searchData"]["ads"];
                let date_filter_content = Array.from(ads).filter((ad: any) => {
                    let ad_date = new Date(ad['index_date']);
                    return ad_date.getUTCFullYear() === check_date.getUTCFullYear() &&
                        ad_date.getUTCMonth() === check_date.getUTCMonth() &&
                        ad_date.getUTCDate() === check_date.getUTCDate();
                });
                if (date_filter_content.length === 0) {
                    this.logger.log("Found ads older than check_date. Stopping the crawler.");
                    return;
                }
                if (ads.length > date_filter_content.length) {
                    this.logger.log("Found ads older than check_date. Stopping the crawler.");
                    await this.dataProcessingService.process(date_filter_content, 'boncoin-crawler');
                    job.update({
                        ...job.data,
                        total_data_grabbed: job.data['total_data_grabbed'] + date_filter_content.length
                    });
                    return;
                };
                await this.dataProcessingService.process(date_filter_content, 'boncoin-crawler');
                job.update({
                    ...job.data,
                    total_data_grabbed: job.data['total_data_grabbed'] + date_filter_content.length
                })
                await waitForSelector("a[title='Page suivante']");
                const next_page_html = await page.$('a[title="Page suivante"]');
                const next_page = await next_page_html?.getAttribute('href');
                if (!next_page) return;
                await enqueueLinks({
                    urls: [`${base_url}${next_page}`],
                    label: 'next_page'
                });
            },
            failedRequestHandler: async ({ request, proxyInfo }, error) => {
                await job.update({
                    ...job.data,
                    job_id: job.id.toLocaleString(),
                    error_date: new Date(),
                    crawler_origin: 'boncoin',
                    status: 'failed',
                    attempts_count: job.data['attempts_count'] + 1,
                    failedReason: request.errorMessages[-1] || error.message || 'Unknown error',
                    failed_request_url: request.url || 'N/A',
                    proxy_used: proxyInfo ? proxyInfo.url : 'N/A',
                });
            }
        }, boncoinConfig);
    }
}