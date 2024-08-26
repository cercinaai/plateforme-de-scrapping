import { Cookie, Dictionary, FinalStatistics, PlaywrightCrawler, ProxyConfiguration, ProxyInfo, Request, RequestQueue, Session } from 'crawlee';
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Inject, Logger, Scope } from '@nestjs/common';
import { DataProcessingService } from '../../data-processing/data-processing.service';
import { boncoinConfig } from './../../config/crawler.config';
import { boncoinCrawlerOption } from './../../config/playwright.config';
import { ProxyService } from '../proxy.service';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Page } from 'playwright';
import { createCursor } from '@avilabs/ghost-cursor-playwright';

@Processor('crawler')
export class BoncoinCrawler {
    private readonly logger = new Logger(BoncoinCrawler.name);
    private readonly target_url: string = 'https://www.leboncoin.fr/recherche?category=9&owner_type=pro';

    constructor(private dataProcessingService: DataProcessingService, private proxyService: ProxyService, private configService: ConfigService, private httpClient: HttpService) { }

    @Process('boncoin-crawler')
    async full_data_crawler(job: Job) {
        await job.update({
            ...job.data,
            total_data_grabbed: 0,
            attempts_count: 0
        });
        const stat = await this.runCrawler(job, this.target_url);
        if (!this.isJobFailed(job, stat)) {
            await this.updateJobSuccess(job, stat);
            return;
        }
        await this.updateJobFailure(job, stat)
    }
    private async runCrawler(job: Job, url: string = this.target_url): Promise<FinalStatistics> {
        const crawler = await this._configure_crawler_captcha(job);
        this.logger.log(`Starting Crawler Boncoin`);
        const stat: FinalStatistics = await crawler.run([url]);
        await crawler.requestQueue.drop();
        await crawler.teardown();
        return stat;
    }

    private async _configure_crawler_captcha(job: Job): Promise<PlaywrightCrawler> {
        const request_queue = await RequestQueue.open('boncoin-crawler-queue');
        return new PlaywrightCrawler({
            ...boncoinCrawlerOption,
            requestQueue: request_queue,
            proxyConfiguration: new ProxyConfiguration({
                proxyUrls: this.proxyService.get_proxy_list()
            }),

            requestHandler: async ({ page, enqueueLinks, closeCookieModals, waitForSelector }) => await this.boncoinRequestHandler(job, page, closeCookieModals, enqueueLinks, waitForSelector),

            failedRequestHandler: async ({ request, proxyInfo }, error) => await this.boncoinFailedRequestHandler(job, request, proxyInfo, error),
        }, boncoinConfig);
    }

    private async handleCapSolver(page: Page, request: Request<Dictionary>, proxyInfo: ProxyInfo, crawler: PlaywrightCrawler, session: Session) {
        await page.waitForLoadState('domcontentloaded');
        const captchaUrl = await this._detect_captcha(page, session);
        const cursor = await createCursor(page);
        await cursor.performRandomMove();
        if (!captchaUrl) return;
        this.logger.log('Attempting to solve dataDome CAPTCHA using CapSolver.');
        const playload = {
            clientKey: this.configService.get<string>('CAPSOLVER_API_KEY'),
            task: {
                type: 'DatadomeSliderTask',
                websiteURL: request.url,
                captchaUrl: captchaUrl,
                proxy: `${proxyInfo.hostname}:${proxyInfo.port}`,
                userAgent: crawler.launchContext.userAgent
            }
        }
        await cursor.performRandomMove();
        const createTaskRes = await this.httpClient.axiosRef.post('https://api.capsolver.com/createTask', playload, { headers: { "Content-Type": "application/json" } });
        const task_id = createTaskRes.data.taskId;
        if (!task_id) throw new Error('Failed to create CapSolver task');
        try {
            while (true) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                const getResultPayload = { clientKey: this.configService.get<string>('CAPSOLVER_API_KEY'), taskId: task_id };
                const taskRes = await this.httpClient.axiosRef.post("https://api.capsolver.com/getTaskResult", getResultPayload, { headers: { "Content-Type": "application/json" } });
                const status = taskRes.data.status;
                if (status === "ready") {
                    await cursor.performRandomMove();
                    this.logger.log(`Solved dataDome CAPTCHA using CapSolver Cookie Generated: ${taskRes.data.solution.cookie}`);
                    let cookie = this.parseCookieString(taskRes.data.solution.cookie);
                    await page.context().addCookies([cookie]);
                    await page.reload({ waitUntil: 'domcontentloaded' });
                    await page.waitForTimeout(5000);
                    return;
                }
                if (status === "failed" || taskRes.data.errorId) throw new Error(taskRes.data.errorMessage);
            }
        } catch (error) {
            throw new Error(error.message);
        }

    }

    private async boncoinRequestHandler(job: Job, page: Page, closeCookieModals: Function, enqueueLinks: Function, waitForSelector: Function) {
        await closeCookieModals();
        let check_date = new Date();
        const base_url = 'https://www.leboncoin.fr';
        let data = await page.$("script[id='__NEXT_DATA__']");
        let ads = JSON.parse(await data?.textContent() as string)["props"]["pageProps"]["searchData"]["ads"];
        let date_filter_content = Array.from(ads).filter((ad: any) => {
            let ad_date = new Date(ad['index_date']);
            // Create a date object for the previous day
            let previous_day = new Date(check_date);
            previous_day.setDate(check_date.getDate() - 1);

            // Check if the ad_date matches either the check_date or the previous day
            return (ad_date.getUTCFullYear() === check_date.getUTCFullYear() &&
                ad_date.getUTCMonth() === check_date.getUTCMonth() &&
                ad_date.getUTCDate() === check_date.getUTCDate()) ||
                (ad_date.getUTCFullYear() === previous_day.getUTCFullYear() &&
                    ad_date.getUTCMonth() === previous_day.getUTCMonth() &&
                    ad_date.getUTCDate() === previous_day.getUTCDate());
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
    }
    private async boncoinFailedRequestHandler(job: Job, request: Request<Dictionary>, proxyInfo: ProxyInfo, error: Error) {
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
    private async _detect_captcha(page: Page, session: Session): Promise<string | null> {
        const captchaElement = await page.$("body > iframe[src*='https://geo.captcha-delivery.com/captcha']");
        if (!captchaElement) return null;
        const captchaUrl = await captchaElement.getAttribute('src');
        const captchaFrame = await captchaElement.contentFrame();
        if (!captchaFrame) throw new Error('Failed to get captcha frame');
        const isFlagged = await captchaFrame.$('#captcha-container > div.captcha__human > div > p');
        if (isFlagged) {
            const textContent = await isFlagged.textContent();
            if (textContent && textContent.match(/blocked/i)) {
                session.retire();
                this.logger.log(`Session flagged. Switching to new session After 2 minute.`);
                await new Promise(resolve => setTimeout(resolve, 2 * 60 * 1000));
                return;
            }
        }
        return captchaUrl;
    }
    private isJobFailed(job: Job, stat: FinalStatistics): boolean {
        return (job.data['status'] && job.data['status'] === 'failed') || stat.requestsFailed > 0 || stat.requestsTotal === 0;
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

    parseCookieString(cookieString: string): Cookie {
        const cookieArray = cookieString.split(';').map(part => part.trim());
        const [nameValue, ...attributes] = cookieArray;
        const [name, value] = nameValue.split('=');

        const cookie: Cookie = {
            name,
            value,
        };

        attributes.forEach(attribute => {
            const [key, val] = attribute.split('=');
            switch (key.toLowerCase()) {
                case 'domain':
                    cookie.domain = val;
                    break;
                case 'path':
                    cookie.path = val;
                    break;
                case 'secure':
                    cookie.secure = true;
                    break;
                case 'httponly':
                    cookie.httpOnly = true;
                    break;
                case 'samesite':
                    cookie.sameSite = val as 'Strict' | 'Lax' | 'None';
                    break;
                case 'max-age':
                    cookie.expires = Math.floor(Date.now() / 1000) + parseInt(val);
                    break;
            }
        });

        return cookie;
    }
}