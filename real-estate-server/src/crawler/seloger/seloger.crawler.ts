import { Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { DataProcessingService } from "../../data-processing/data-processing.service";
import { Job } from "bull";
import { Cookie, Dictionary, FinalStatistics, PlaywrightCrawler, PlaywrightCrawlingContext, ProxyConfiguration, ProxyInfo, Request, RequestQueue, Session } from "crawlee";
import { Page } from "playwright";
import { selogerConfig } from "../../config/crawler.config";
import { selogerCrawlerOptions } from "../../config/playwright.config";
import { ProxyService } from "../proxy.service";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Ad } from "../../models/ad.schema";
import { Model } from "mongoose";
import { HttpService } from "@nestjs/axios";
import { CrawlerInterface } from "../crawler.interface";
import { createSelogerRouter } from './router/seloger.router';
import { handleCrawlerState } from "../utils/handleCrawlerState.util";
import { preSelogerHooksRegister } from "./preNavigation/preHooks.register";
import { postSelogerHooksRegister } from "./postNavigation/postHooks.register";

@Processor('crawler')
export class SelogerCrawler implements CrawlerInterface {

    constructor(private readonly proxyService: ProxyService, private readonly dataProcessingService: DataProcessingService, @InjectModel(Ad.name) private readonly adModel: Model<Ad>) { }

    @Process({ name: 'seloger-crawler' })
    async start(job: Job) {
        await this.initialize(job);
        const stat = await this.crawl(job);
        await handleCrawlerState(job, stat);
    }



    async crawl(job: Job): Promise<FinalStatistics> {
        const crawler = await this.configureCrawler(job);
        const stat = await crawler.run([this._build_url(job)]);
        await crawler.requestQueue.drop();
        await crawler.teardown();
        return stat;
    }

    async configureCrawler(job: Job): Promise<PlaywrightCrawler> {
        const selogerQueue = await RequestQueue.open('seloger-crawler-queue');
        return new PlaywrightCrawler({
            ...selogerCrawlerOptions,
            requestQueue: selogerQueue,
            preNavigationHooks: preSelogerHooksRegister,
            postNavigationHooks: postSelogerHooksRegister,
            requestHandler: await createSelogerRouter(job, this.dataProcessingService, this.shouldStopCrawler.bind(this)),
            failedRequestHandler: async (context, error) => await this.handleCrawlerError(error, job, context),
            proxyConfiguration: new ProxyConfiguration({ proxyUrls: this.proxyService.get_proxy_list() }),
            errorHandler: async ({ log }, error) => log.error(error.message),
        }, selogerConfig);
    }

    async initialize(job: Job): Promise<void> {
        await job.update({
            crawler_origin: 'seloger',
            total_data_grabbed: 0,
            attempts_count: 0,
            status: 'running',
            REGION_REACHED: 0,
            france_locality: [
                { name: 'Île-de-France', link: ['2238'], limit: 986, data_grabbed: 0 },
                { name: 'Centre-Val de Loire', link: ['2234'], limit: 149, data_grabbed: 0 },
                { name: 'Bourgogne-Franche-Comté', link: ['2232'], limit: 156, data_grabbed: 0 },
                { name: 'Normandie', link: ['2236', '2231'], limit: 188, data_grabbed: 0 },
                { name: 'Hauts-de-France', link: ['2243', '2244'], limit: 264, data_grabbed: 0 },
                { name: 'Grand Est', link: ['2228', '2235', '2241'], limit: 293, data_grabbed: 0 },
                { name: 'Pays de la Loire', link: ['2247'], limit: 256, data_grabbed: 0 },
                { name: 'Bretagne', link: ['2233'], limit: 235, data_grabbed: 0 },
                { name: 'Nouvelle-Aquitaine', link: ['2229'], limit: 530, data_grabbed: 0 },
                { name: 'Occitanie', link: ['2239', '2242'], limit: 536, data_grabbed: 0 },
                { name: 'Auvergne-Rhône-Alpes', link: ['2251', '2230'], limit: 626, data_grabbed: 0 },
                { name: 'Corse', link: ['2248'], limit: 39, data_grabbed: 0 },
                // { name: 'Guadeloupe', link: ['900'], limit: 32, data_grabbed: 0 },
                // { name: 'Martinique', link: ['902'], limit: 23, data_grabbed: 0 },
                // { name: 'Guyane', link: ['903'], limit: 9, data_grabbed: 0 },
                // { name: 'La Reunion', link: ['906'], limit: 42, data_grabbed: 0 },
                // { name: 'Mayotte', link: ['903'], limit: 1, data_grabbed: 0 },
            ]
        });
    }

    async handleCrawlerError(error: Error, job: Job, ctx: PlaywrightCrawlingContext): Promise<void> {
        const { request, proxyInfo } = ctx;
        await job.update({
            ...job.data,
            attempts_count: job.data['attempts_count'] + 1,
            status: 'failed',
            error: {
                failed_date: new Date(),
                failedReason: request.errorMessages[-1] || error.message || 'Unknown error',
                failed_request_url: request.url || 'N/A',
                proxy_used: proxyInfo ? proxyInfo.url : 'N/A',
            }
        })
    }

    private _build_url(job: Job): string {
        const { link } = job.data.france_locality[job.data.REGION_REACHED]
        const grouped_urls = link.map((l: string) => ({ divisions: [parseInt(l)] }))
        const string_urls = JSON.stringify(grouped_urls)
        return `https://www.seloger.com/list.htm?projects=2,5&types=2,4,1,13,9,3,14,12,11,10&natures=1,2,4&places=${string_urls}&sort=d_dt_crea&mandatorycommodities=0&privateseller=0&enterprise=0&houseboat=1&qsVersion=1.0&m=search_refine-redirection-search_results`
    }


    // private readonly logger = new Logger(SelogerCrawler.name);
    // private readonly targetUrl = 'https://www.seloger.com/list.htm?projects=2,5&types=2,4,1,13,9,3,14,12,11,10&natures=1,2,4&sort=d_dt_crea&mandatorycommodities=0&privateseller=0&enterprise=0&houseboat=1&qsVersion=1.0&m=search_refine-redirection-search_results';
    // private readonly LIMIT_PER_PAGE = 20;
    // constructor(
    //     private readonly dataProcessingService: DataProcessingService,
    //     private readonly proxyService: ProxyService,
    //     private readonly configService: ConfigService,
    //     private readonly httpClient: HttpService,
    //     @InjectModel(Ad.name) private readonly adModel: Model<Ad>
    // ) { }

    // @Process({ name: 'seloger-crawler' })
    // async full_data_crawler(job: Job) {
    //     await job.update({
    //         ...job.data,
    //         total_data_grabbed: 0,
    //         attempts_count: 0,
    //         PAGE_REACHED: 1
    //     });
    //     const crawler = await this.configureCrawler(job);
    //     const stats = await crawler.run([this.targetUrl]);
    //     if (job.data['status'] && job.data['status'] === 'failed' || stats.requestsTotal === 0) {
    //         await this.handleFailure(job, stats);
    //         return;
    //     }
    //     await this.handleSuccess(job, stats);
    //     await crawler.requestQueue.drop();
    //     await crawler.teardown();
    // }

    // private async configureCrawler(job: Job): Promise<PlaywrightCrawler> {
    //     const selogerQueue = await RequestQueue.open('seloger-crawler-queue');
    //     return new PlaywrightCrawler({
    //         ...selogerCrawlerOptions,
    //         requestQueue: selogerQueue,
    //         requestHandlerTimeoutSecs: 1800,
    //         proxyConfiguration: new ProxyConfiguration({ proxyUrls: this.proxyService.get_proxy_list() }),
    //         preNavigationHooks: [async ({ page }) => await this.extract_data_from_dom(page)],
    //         postNavigationHooks: [async (context) => {
    //             let { page } = context;
    //             await this.handleCapSolver(context);
    //             await page.unrouteAll({ behavior: 'ignoreErrors' });
    //         }],
    //         requestHandler: async ({ page, enqueueLinks, closeCookieModals, waitForSelector }) => await this.selogerRequestHandler(job, page, closeCookieModals, enqueueLinks, waitForSelector),
    //         failedRequestHandler: ({ request, proxyInfo }, error) => this.handleRequestFailure(job, request, proxyInfo, error),
    //     }, selogerConfig);
    // }


    // private async navigate_listing_page(context: PlaywrightCrawlingContext): Promise<void> {
    //     const { page, closeCookieModals, enqueueLinksByClickingElements } = context;
    //     await page.waitForLoadState('domcontentloaded');
    //     await this.handleCapSolver(context);
    //     await closeCookieModals();
    //     const salesPagelink = await page.$('#agatha_actionbuttons > div > div:nth-child(3) > label > a');
    //     await salesPagelink.click();
    //     await page.waitForURL('https://www.seloger.com/**', { waitUntil: 'domcontentloaded' });
    //     await page.waitForTimeout(2000);
    // }

    // private async handleCapSolver(context: PlaywrightCrawlingContext): Promise<void> {
    //     const { page, request, proxyInfo, crawler, session } = context;
    //     const captchaUrl = await this._detect_captcha(page, session);
    //     if (typeof captchaUrl === 'boolean' && captchaUrl === false) return;
    //     if (typeof captchaUrl === 'boolean' && captchaUrl === true) throw new Error('Session flagged. Switching to new session');
    //     this.logger.log('Attempting to solve dataDome CAPTCHA using CapSolver.');
    //     const playload = {
    //         clientKey: this.configService.get<string>('CAPSOLVER_API_KEY'),
    //         task: {
    //             type: 'DatadomeSliderTask',
    //             websiteURL: request.url,
    //             captchaUrl: captchaUrl,
    //             proxy: `${proxyInfo.hostname}:${proxyInfo.port}`,
    //             userAgent: crawler.launchContext.userAgent
    //         }
    //     }
    //     const createTaskRes = await this.httpClient.axiosRef.post('https://api.capsolver.com/createTask', playload, { headers: { "Content-Type": "application/json" } });
    //     const task_id = createTaskRes.data.taskId;
    //     if (!task_id) throw new Error('Failed to create CapSolver task');
    //     while (true) {
    //         await new Promise(resolve => setTimeout(resolve, 1000));
    //         const getResultPayload = { clientKey: this.configService.get<string>('CAPSOLVER_API_KEY'), taskId: task_id };
    //         const taskRes = await this.httpClient.axiosRef.post("https://api.capsolver.com/getTaskResult", getResultPayload, { headers: { "Content-Type": "application/json" } });
    //         const status = taskRes.data.status;
    //         if (status === "ready") {
    //             this.logger.log(`Solved dataDome CAPTCHA using CapSolver`);
    //             const cookie = this.parseCookieString(taskRes.data.solution.cookie);
    //             await page.context().addCookies([cookie]);
    //             await page.reload({ waitUntil: 'domcontentloaded' });
    //             return;
    //         }
    //         if (status === "failed" || taskRes.data.errorId) throw new Error(taskRes.data.errorMessage);
    //     }
    // }

    // private async selogerRequestHandler(job: Job, page: Page, closeCookieModals: Function, enqueueLinks: Function, waitForSelector: Function) {
    //     await closeCookieModals();
    //     let ads = [];
    //     if (job.data['PAGE_REACHED'] === 1) {
    //         ads = await page.evaluate(() => Array.from(window['initialData']['cards']['list']).filter(card => card['cardType'] === 'classified'));
    //     } else {
    //         ads = await page.evaluate(() => window['crawled_ads']);
    //     }
    //     if ((await this.shouldStopCrawler(ads) === true) || job.data['PAGE_REACHED'] >= this.LIMIT_PER_PAGE) {
    //         this.logger.log("Found ads older than check_date. Stopping the crawler.");
    //         return;
    //     }
    //     await this.dataProcessingService.process(ads, 'seloger-crawler');
    //     await job.update({
    //         ...job.data,
    //         totalDataGrabbed: job.data['total_data_grabbed'] + ads.length
    //     })
    //     await waitForSelector('a[data-testid="gsl.uilib.Paging.nextButton"]');
    //     const nextButton = await page.$('a[data-testid="gsl.uilib.Paging.nextButton"]');
    //     if (nextButton) {
    //         await nextButton.click();
    //         await page.waitForURL('https://www.seloger.com/**', { waitUntil: 'domcontentloaded' });
    //         await job.update({ ...job.data, PAGE_REACHED: job.data['PAGE_REACHED'] + 1 });
    //         await enqueueLinks({ urls: [page.url()] });
    //     }
    // }

    // private async extract_data_from_dom(page: Page) {
    //     await page.route('https://www.seloger.com/search-bff/api/externaldata/**', async (route) => {
    //         let res = await route.fetch();
    //         let body = await res.json();
    //         if (!body['listingData']['cards'] || body['listingData']['cards'].length === 0) return;
    //         let ads = body['listingData']['cards'];
    //         await route.continue();
    //         await page.evaluate((ads) => {
    //             window['crawled_ads'] = ads.filter((card: any) => card['type'] === 0);
    //         }, ads);
    //     })
    // }

    // private async _detect_captcha(page: Page, session: Session): Promise<string | boolean> {
    //     const captchaElement = await page.$("body > iframe[src*='https://geo.captcha-delivery.com/captcha']");
    //     if (!captchaElement) return false;
    //     const captchaUrl = await captchaElement.getAttribute('src');
    //     const captchaFrame = await captchaElement.contentFrame();
    //     if (!captchaFrame) throw new Error('Failed to get captcha frame');
    //     const isFlagged = await captchaFrame.$('#captcha-container > div.captcha__human > div > p');
    //     if (isFlagged) {
    //         const textContent = await isFlagged.textContent();
    //         if (textContent && textContent.match(/blocked/i)) {
    //             session.retire();
    //             this.logger.log(`Session flagged. Switching to new session`);
    //             return true;
    //         }
    //     }
    //     return captchaUrl;
    // }
    // private async handleRequestFailure(job: Job, request: Request<Dictionary>, proxyInfo: ProxyInfo, error: Error) {
    //     await job.update({
    //         ...job.data,
    //         job_id: job.id.toLocaleString(),
    //         error_date: new Date(),
    //         crawler_origin: 'seloger',
    //         status: 'failed',
    //         total_data_grabbed: job.data['total_data_grabbed'],
    //         attempts_count: job.data['attempts_count'] + 1,
    //         failedReason: request.errorMessages[-1] || error.message || 'Unknown error',
    //         failed_request_url: request.url || 'N/A',
    //         proxy_used: proxyInfo ? proxyInfo.url : 'N/A',
    //     });
    // }

    // protected async handleFailure(job: Job, stats: FinalStatistics) {
    //     if (job.data['status'] && job.data['status'] === 'failed') {
    //         await job.update({
    //             ...job.data,
    //             total_request: stats.requestsTotal,
    //             success_requests: stats.requestsFinished,
    //             failed_requests: stats.requestsFailed,
    //         })
    //         await job.moveToFailed(job.data['failedReason']);
    //         return;
    //     }
    //     if (stats.requestsTotal === 0) {
    //         await job.update({
    //             ...job.data,
    //             error_date: new Date(),
    //             status: 'failed',
    //             total_request: stats.requestsTotal,
    //             attempts_count: job.data['attempts_count'] + 1,
    //             failed_requests: stats.requestsFailed,
    //             failed_request_url: 'N/A',
    //             proxy_used: 'N/A',
    //             failedReason: 'Crawler did not start as expected'
    //         })
    //         await job.moveToFailed(job.data['failedReason']);
    //     }
    // }
    // protected async handleSuccess(job: Job, stats: FinalStatistics) {
    //     await job.update({
    //         ...job.data,
    //         success_date: new Date(),
    //         status: 'success',
    //         total_request: stats.requestsTotal,
    //         attempts_count: job.data['attempts_count'] + 1,
    //         success_requests: stats.requestsFinished,
    //         failed_requests: stats.requestsFailed,
    //     });
    // }

    // private parseCookieString(cookieString: string): Cookie {
    //     const cookieArray = cookieString.split(';').map(part => part.trim());
    //     const [nameValue, ...attributes] = cookieArray;
    //     const [name, value] = nameValue.split('=');

    //     const cookie: Cookie = { name, value };

    //     attributes.forEach(attribute => {
    //         const [key, val] = attribute.split('=');
    //         switch (key.toLowerCase()) {
    //             case 'domain':
    //                 cookie.domain = val;
    //                 break;
    //             case 'path':
    //                 cookie.path = val;
    //                 break;
    //             case 'secure':
    //                 cookie.secure = true;
    //                 break;
    //             case 'httponly':
    //                 cookie.httpOnly = true;
    //                 break;
    //             case 'samesite':
    //                 cookie.sameSite = val as 'Strict' | 'Lax' | 'None';
    //                 break;
    //             case 'max-age':
    //                 cookie.expires = Math.floor(Date.now() / 1000) + parseInt(val);
    //                 break;
    //         }
    //     });

    //     return cookie;
    // }

    private async shouldStopCrawler(ads: any[]): Promise<boolean> {
        const ids = ads.map(ad => ad.id.toString());
        const existingAds = await this.adModel.find({ adId: { $in: ids }, origin: 'seloger' });
        console.log(existingAds.length, ids.length);
        if (!existingAds || existingAds.length === 0) return false;
        if (existingAds.length < ids.length) {
            const newAds = ads.filter(ad => !existingAds.find(existingAd => existingAd.adId === ad.id.toString()));
            await this.dataProcessingService.process(newAds, 'seloger-crawler');
            return true;
        }
        if (existingAds.length === ids.length) return true;
    }
}
