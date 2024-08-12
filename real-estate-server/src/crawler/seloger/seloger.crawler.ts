import { Process, Processor } from "@nestjs/bull";
import { Logger, Scope } from "@nestjs/common";
import { DataProcessingService } from "src/data-processing/data-processing.service";
import { Job } from "bull";
import { Cookie, Dictionary, FinalStatistics, PlaywrightCrawler, ProxyConfiguration, ProxyInfo, Request, RequestQueue } from "crawlee";
import { Page } from "playwright";
import { selogerConfig, selogerCrawlerOptions } from "./seloger.config";
import { ProxyService } from "../proxy.service";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Ad } from "src/models/ad.schema";
import { Model } from "mongoose";
import { HttpService } from "@nestjs/axios";

@Processor({ name: 'crawler', scope: Scope.DEFAULT })
export class SelogerCrawler {
    private readonly logger = new Logger(SelogerCrawler.name);
    private readonly targetUrl = 'https://www.seloger.com/list.htm?projects=2,5&types=2,4,1,3,9,11,14,10,13&natures=1,2,4&sort=d_dt_crea&mandatorycommodities=0&privateseller=0&enterprise=0&houseboat=1&qsVersion=1.0&m=search_refine-redirection-search_results';
    private readonly LIMIT_PER_PAGE = 20;
    constructor(
        private readonly dataProcessingService: DataProcessingService,
        private readonly proxyService: ProxyService,
        private readonly configService: ConfigService,
        private readonly httpClient: HttpService,
        @InjectModel(Ad.name) private readonly adModel: Model<Ad>
    ) { }

    @Process('seloger-crawler')
    async full_data_crawler(job: Job) {
        await job.update({
            ...job.data,
            total_data_grabbed: 0,
            attempts_count: 0,
            PAGE_REACHED: 1
        });
        const crawler = await this.configureCrawler(job);
        const stats = await crawler.run([this.targetUrl]);
        await this.handleCrawlerCompletion(job, stats);
        await crawler.requestQueue.drop();
        await crawler.teardown();
    }

    private async configureCrawler(job: Job): Promise<PlaywrightCrawler> {
        const selogerQueue = await RequestQueue.open('seloger-crawler-queue');
        return new PlaywrightCrawler({
            ...selogerCrawlerOptions,
            requestQueue: selogerQueue,
            proxyConfiguration: new ProxyConfiguration({ proxyUrls: this.proxyService.get_proxy_list() }),
            postNavigationHooks: [async ({ closeCookieModals, page, enqueueLinks, request, proxyInfo, crawler }) => await this.handleCapSolver(page, request, proxyInfo, crawler, job, closeCookieModals, enqueueLinks)],
            failedRequestHandler: ({ request, proxyInfo }, error) => this.handleRequestFailure(job, request, proxyInfo, error),
        }, selogerConfig);
    }

    private async handleCapSolver(page: Page, request: Request<Dictionary>, proxyInfo: ProxyInfo, crawler: PlaywrightCrawler, job: Job, closeCookieModals: Function, enqueueLinks: Function,): Promise<void> {
        await page.waitForLoadState('domcontentloaded');
        const captchaFrame = await page.$("body > iframe[src*='https://geo.captcha-delivery.com/captcha']");
        if (!captchaFrame) {
            await this.selogerRequestHandler(job, page, closeCookieModals, enqueueLinks);
            return;
        };
        const captchaUrl = await captchaFrame.getAttribute('src');
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
        try {
            const createTaskRes = await this.httpClient.axiosRef.post('https://api.capsolver.com/createTask', playload, { headers: { "Content-Type": "application/json" } });
            const task_id = createTaskRes.data.taskId;
            if (!task_id) throw new Error('Failed to create CapSolver task');
            while (true) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                const getResultPayload = { clientKey: this.configService.get<string>('CAPSOLVER_API_KEY'), taskId: task_id };
                const taskRes = await this.httpClient.axiosRef.post("https://api.capsolver.com/getTaskResult", getResultPayload, { headers: { "Content-Type": "application/json" } });
                const status = taskRes.data.status;
                if (status === "ready") {
                    this.logger.log(`Solved dataDome CAPTCHA using CapSolver GENERATED COOKIE => ${taskRes.data.solution.cookie}`);
                    const cookie = this.parseCookieString(taskRes.data.solution.cookie);
                    await page.context().addCookies([cookie]);
                    await page.reload({ waitUntil: 'domcontentloaded' });
                    await new Promise(resolve => setTimeout(resolve, 500));
                    await this.selogerRequestHandler(job, page, closeCookieModals, enqueueLinks);
                    return;
                }
                if (status === "failed" || taskRes.data.errorId) throw new Error(taskRes.data.errorMessage);
            }
        } catch (error) {
            throw new Error(error);
        }
    }

    private async selogerRequestHandler(job: Job, page: Page, closeCookieModals: Function, enqueueLinks: Function) {
        await closeCookieModals();
        const ads = await page.evaluate(() => Array.from(window['initialData']['cards']['list']).filter(card => card['cardType'] === 'classified'));
        if (await this.shouldStopCrawler(ads) === true || job.data['PAGE_REACHED'] < this.LIMIT_PER_PAGE) {
            this.logger.log("Found ads older than check_date. Stopping the crawler.");
            return;
        }
        await this.dataProcessingService.process(ads, 'seloger-crawler');
        job.update({
            ...job.data,
            totalDataGrabbed: job.data['total_data_grabbed'] + ads.length
        })
        const nextButton = await page.$('a[data-testid="gsl.uilib.Paging.nextButton"]');
        if (nextButton) {
            await nextButton.click();
            await page.waitForURL('https://www.seloger.com/**', { waitUntil: 'domcontentloaded' });
            await job.update({ PAGE_REACHED: job.data['PAGE_REACHED'] + 1 });
            await enqueueLinks({ urls: [page.url()] });
        }
    }

    private async handleRequestFailure(job: Job, request: Request<Dictionary>, proxyInfo: ProxyInfo, error: Error) {
        await job.update({
            job_id: job.id.toLocaleString(),
            error_date: new Date(),
            crawler_origin: 'seloger',
            status: 'failed',
            total_data_grabbed: job.data['total_data_grabbed'],
            attempts_count: job.data['attempts_count'] + 1,
            failedReason: request.errorMessages[-1] || error.message || 'Unknown error',
            failed_request_url: request.url || 'N/A',
            proxy_used: proxyInfo ? proxyInfo.url : 'N/A',
        });
    }

    private async handleCrawlerCompletion(job: Job, stats: FinalStatistics) {
        if (job.data['status'] === 'failed') {
            job.update({
                ...job.data,
                total_request: stats.requestsTotal,
                success_requests: stats.requestsFinished,
                failed_requests: stats.requestsFailed,
            })
            await job.moveToFailed(job.data['failedReason'], false);
            return;
        }
        await job.update({
            ...job.data,
            success_date: new Date(),
            crawler_origin: 'seloger',
            status: job.data['status'] === 'failed' ? 'failed' : 'success',
            total_data_grabbed: job.data['total_data_grabbed'],
            total_request: stats.requestsTotal,
            attempts_count: job.data['attempts_count'] + 1,
            success_requests: stats.requestsFinished,
            failed_requests: stats.requestsFailed,
        });
    }

    private parseCookieString(cookieString: string): Cookie {
        const cookieArray = cookieString.split(';').map(part => part.trim());
        const [nameValue, ...attributes] = cookieArray;
        const [name, value] = nameValue.split('=');

        const cookie: Cookie = { name, value };

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

    private async shouldStopCrawler(ads: any[]): Promise<boolean> {
        const ids = ads.map(ad => ad.id.toString());
        const existingAds = await this.adModel.find({ adId: { $in: ids }, origin: 'seloger' });
        if (!existingAds || existingAds.length === 0) return false;
        if (existingAds.length < ids.length) {
            const newAds = ads.filter(ad => !existingAds.find(existingAd => existingAd.adId === ad.id.toString()));
            await this.dataProcessingService.process(newAds, 'seloger-crawler');
            return true;
        }
        if (existingAds.length === ids.length) return true;
    }
}
