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
import { createCursor } from '@avilabs/ghost-cursor-playwright';

@Processor('crawler')
export class SelogerCrawler {
    private readonly logger = new Logger(SelogerCrawler.name);
    private readonly targetUrl = 'https://www.seloger.com/list.htm?projects=2,5&types=2,4,1,13,9,3,14,12,11,10&natures=1,2,4&sort=d_dt_crea&mandatorycommodities=0&privateseller=0&enterprise=0&houseboat=1&qsVersion=1.0&m=search_refine-redirection-search_results';
    private readonly LIMIT_PER_PAGE = 20;
    constructor(
        private readonly dataProcessingService: DataProcessingService,
        private readonly proxyService: ProxyService,
        private readonly configService: ConfigService,
        private readonly httpClient: HttpService,
        @InjectModel(Ad.name) private readonly adModel: Model<Ad>
    ) { }

    @Process({ name: 'seloger-crawler' })
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
            preNavigationHooks: [async ({ page }) => await this.extract_data_from_dom(page)],
            postNavigationHooks: [async (context) => {
                let { page } = context;
                await this.handleCapSolver(context);
                await page.unrouteAll({ behavior: 'ignoreErrors' });
            }],
            requestHandler: async ({ page, enqueueLinks, closeCookieModals, waitForSelector }) => await this.selogerRequestHandler(job, page, closeCookieModals, enqueueLinks, waitForSelector),
            failedRequestHandler: ({ request, proxyInfo }, error) => this.handleRequestFailure(job, request, proxyInfo, error),
        }, selogerConfig);
    }


    private async navigate_listing_page(context: PlaywrightCrawlingContext): Promise<void> {
        const { page, closeCookieModals, enqueueLinksByClickingElements } = context;
        await page.waitForLoadState('domcontentloaded');
        await this.handleCapSolver(context);
        await closeCookieModals();
        const cursor = await createCursor(page);
        await cursor.performRandomMove();
        const salesPagelink = await page.$('#agatha_actionbuttons > div > div:nth-child(3) > label > a');
        await cursor.actions.move('#agatha_actionbuttons > div > div:nth-child(3) > label > a');
        await salesPagelink.click();
        await page.waitForURL('https://www.seloger.com/**', { waitUntil: 'domcontentloaded' });
        await cursor.performRandomMove();
        await page.waitForTimeout(2000);
        await cursor.actions.click({ target: '#search-section > div > div.Agathav2Bar__WrapperRefiner-sc-1qakpqy-2.dUYXnB > form > div.LocationPanel__LocationSection-sc-r69d19-0.jupNmu.Section__SectionContainer-sc-d7seoh-0.YgRPE' }, { waitForSelector: 1000 });
        await cursor.actions.click({ target: '#search-section > div > div.Agathav2Bar__WrapperRefiner-sc-1qakpqy-2.dUYXnB > form > div.LocationPanel__LocationSection-sc-r69d19-0.jupNmu.Section__SectionContainer-sc-d7seoh-0.YgRPE > div.Section__SectionPanel-sc-d7seoh-1.OwWIr.Panel__PanelContainer-sc-v47afd-0.ehpIKZ > div.Panel__PanelContentWrapper-sc-v47afd-3.ebnVIU > div.LocationPanel__LocationContent-sc-r69d19-3.bIWlby > div.LocationPanel__LocationPlacesTab-sc-r69d19-1.goYWdD.places__PlacesTabContainer-sc-1vkjt2k-0.bhETso > div.places__LocationChips-sc-1vkjt2k-1.ghHwem.Chips__ChipContainer-sc-u5fwzj-0.NEGYs > div > span' }, { waitForSelector: 1000 });
        await cursor.performRandomMove();
    }

    private async handleCapSolver(context: PlaywrightCrawlingContext): Promise<void> {
        const { page, request, proxyInfo, crawler, session } = context;
        const captchaUrl = await this._detect_captcha(page, session);
        if (typeof captchaUrl === 'boolean' && captchaUrl === false) return;
        if (typeof captchaUrl === 'boolean' && captchaUrl === true) throw new Error('Session flagged. Switching to new session');
        const cursor = await createCursor(page);
        await cursor.performRandomMove();
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
        while (true) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const getResultPayload = { clientKey: this.configService.get<string>('CAPSOLVER_API_KEY'), taskId: task_id };
            const taskRes = await this.httpClient.axiosRef.post("https://api.capsolver.com/getTaskResult", getResultPayload, { headers: { "Content-Type": "application/json" } });
            const status = taskRes.data.status;
            if (status === "ready") {
                this.logger.log(`Solved dataDome CAPTCHA using CapSolver`);
                const cookie = this.parseCookieString(taskRes.data.solution.cookie);
                await page.context().addCookies([cookie]);
                await page.reload({ waitUntil: 'domcontentloaded' });
                await cursor.performRandomMove();
                return;
            }
            if (status === "failed" || taskRes.data.errorId) throw new Error(taskRes.data.errorMessage);
        }
    }

    private async selogerRequestHandler(job: Job, page: Page, closeCookieModals: Function, enqueueLinks: Function, waitForSelector: Function) {
        await closeCookieModals();
        let ads = [];
        if (job.data['PAGE_REACHED'] === 1) {
            ads = await page.evaluate(() => Array.from(window['initialData']['cards']['list']).filter(card => card['cardType'] === 'classified'));
        } else {
            ads = await page.evaluate(() => window['crawled_ads']);
        }
        if ((await this.shouldStopCrawler(ads) === true) || job.data['PAGE_REACHED'] >= this.LIMIT_PER_PAGE) {
            this.logger.log("Found ads older than check_date. Stopping the crawler.");
            return;
        }
        await this.dataProcessingService.process(ads, 'seloger-crawler');
        await job.update({
            ...job.data,
            totalDataGrabbed: job.data['total_data_grabbed'] + ads.length
        })
        await waitForSelector('a[data-testid="gsl.uilib.Paging.nextButton"]');
        const nextButton = await page.$('a[data-testid="gsl.uilib.Paging.nextButton"]');
        if (nextButton) {
            await nextButton.click();
            await page.waitForURL('https://www.seloger.com/**', { waitUntil: 'domcontentloaded' });
            await job.update({ ...job.data, PAGE_REACHED: job.data['PAGE_REACHED'] + 1 });
            await enqueueLinks({ urls: [page.url()] });
        }
    }

    private async extract_data_from_dom(page: Page) {
        await page.route('https://www.seloger.com/search-bff/api/externaldata/**', async (route) => {
            let res = await route.fetch();
            let body = await res.json();
            if (!body['listingData']['cards'] || body['listingData']['cards'].length === 0) return;
            let ads = body['listingData']['cards'];
            await route.continue();
            await page.evaluate((ads) => {
                window['crawled_ads'] = ads.filter((card: any) => card['type'] === 0);
            }, ads);
        })
    }

    private async _detect_captcha(page: Page, session: Session): Promise<string | boolean> {
        const captchaElement = await page.$("body > iframe[src*='https://geo.captcha-delivery.com/captcha']");
        if (!captchaElement) return false;
        const captchaUrl = await captchaElement.getAttribute('src');
        const captchaFrame = await captchaElement.contentFrame();
        if (!captchaFrame) throw new Error('Failed to get captcha frame');
        const isFlagged = await captchaFrame.$('#captcha-container > div.captcha__human > div > p');
        if (isFlagged) {
            const textContent = await isFlagged.textContent();
            if (textContent && textContent.match(/blocked/i)) {
                session.retire();
                this.logger.log(`Session flagged. Switching to new session`);
                return true;
            }
        }
        return captchaUrl;
    }
    private async handleRequestFailure(job: Job, request: Request<Dictionary>, proxyInfo: ProxyInfo, error: Error) {
        await job.update({
            ...job.data,
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
        if (job.data['status'] === 'failed' || stats.requestsFailed > 0 || stats.requestsTotal === 0) {
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
