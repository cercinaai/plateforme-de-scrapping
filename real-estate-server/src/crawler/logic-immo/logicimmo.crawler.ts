import { Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { Job } from "bull";
import { PlaywrightCrawler, FinalStatistics, createPlaywrightRouter } from "crawlee";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Ad } from "../../models/ad.schema";
import { DataProcessingService } from "../../data-processing/data-processing.service";
import { logicimmoConfig } from "../../config/crawler.config";
import { logicimmoCrawlerOption } from "../../config/playwright.config";

@Processor('crawler')
export class LogicImmoCrawler {

    private readonly logger = new Logger(LogicImmoCrawler.name);

    constructor(protected dataProcessingService: DataProcessingService, @InjectModel(Ad.name) protected adModel: Model<Ad>) { }

    @Process({ name: 'logicimmo-crawler' })
    async start(job: Job) {
        await this.initialize(job);
        const stats = await this.crawl(job);
        if (job.data['status'] && job.data['status'] === 'failed' || stats.requestsTotal === 0) {
            await this.handleFailure(job, stats);
            return;
        }
        await this.handleSuccess(job, stats);
    }

    private async initialize(job: Job): Promise<void> {
        await job.update({
            crawler_origin: 'logic-immo',
            status: 'running',
            total_data_grabbed: 0,
            attempts_count: 0,
            localite_index: 0,
            list_page: 1,
            LIMIT_REACHED: false,
            france_localities: ['ile-de-france,1_0', 'alsace,10_0', 'aquitaine,15_0', 'Auvergne,19_0', 'Bretagne,13_0',
                'centre,5_0', 'Bourgogne,7_0', 'champagne-ardenne,2_0', 'corse,22_0',
                'franche-comte,11_0', 'languedoc-roussillon,20_0', 'limousin,17_0', 'lorraine,9_0',
                'basse-normandie,6_0', 'midi-pyrenees,16_0', 'nord-pas-de-calais,8_0', 'pays-de-la-loire,12_0',
                'picardie,3_0', 'poitou-charentes,14_0', 'provence-alpes-cote-d-azur,21_0', 'rhone-alpes,18_0', 'haute-normandie,4_0']
        })
    }

    private async crawl(job: Job): Promise<FinalStatistics> {
        const crawler = this.createCrawler(job);
        const stat = await crawler.run([this.build_link(job)]);
        await crawler.teardown();
        return stat
    }

    private createCrawler(job: Job): PlaywrightCrawler {
        const router = createPlaywrightRouter();
        router.addDefaultHandler(async (context) => {
            const { page, enqueueLinks, closeCookieModals, log } = context;
            await closeCookieModals();
            await page.waitForTimeout(1200);
            const ads = await page.evaluate(() => window['thor']['dataLayer']['av_items']);
            const ads_links = ads.map((ad: any) => `https://www.logic-immo.com/detail-vente-${ad.id}.htm`);
            await enqueueLinks({ urls: ads_links, label: 'ad-single-url' });
            if (job.data['LIMIT_REACHED'] === true) {
                if (job.data['localite_index'] < job.data['france_localities'].length - 1) {
                    log.info('LIMIT REACHED PER LOCALITY REACHED');
                    await job.update({
                        ...job.data,
                        LIMIT_REACHED: false,
                        localite_index: job.data.localite_index + 1,
                        list_page: 1,
                    });
                    await enqueueLinks({ urls: [this.build_link(job)] });
                } else {
                    log.info('ALL LOCALITIES DONE');
                }
                return;
            }
            log.info('NEXT PAGE');
            await job.update({
                ...job.data,
                list_page: job.data.list_page + 1,
            });
            await enqueueLinks({ urls: [this.build_link(job)] });
        });
        router.addHandler('ad-single-url', async (context) => {
            const { page, log } = context;
            const current_date = new Date();
            const previousDay = new Date(current_date);
            previousDay.setDate(previousDay.getDate() - 1);
            await page.waitForLoadState('networkidle');
            const adNotFound = await page.$('body > main > .errorPageBox');
            if (adNotFound) {
                log.info('AD NOT FOUND');
                return;
            }
            const ad_date_brute = await (await page.$('.offer-description-notes')).textContent();
            const extracted_date_match = ad_date_brute.match(/Mis à jour:\s*(\d{2}\/\d{2}\/\d{4})/);
            const ad_date = new Date(extracted_date_match[1].toString().split('/').reverse().join('-'))
            if (!this.isSameDay(ad_date, current_date) && !this.isSameDay(ad_date, previousDay)) {
                log.info('AD OLDER THAN 1 DAY');
                await job.update({
                    ...job.data,
                    LIMIT_REACHED: true
                });
                return;
            }
            let ad = await page.evaluate(() => window['thor']['dataLayer']['av_items'][0]);
            if (!ad) return;
            const titleElement = await page.$('body > main > div > div.mainContent > div.offerDetailContainer > section > div.offerSummary.offerCreditPrice > h1 > p');
            const pictureUrlElement = (await page.$$('.swiper-slide > picture > img')).map(async (img) => await img.getAttribute('src') || await img.getAttribute('data-src'));
            const descriptionElement = await page.$('body > main > div > div.mainContent > div.offerDetailContainer > section > div.nativeAds > div.blocDescrProperty > article > p.descrProperty');
            const gas_certificateElement = await page.$("body > main > div > div.mainContent > div.offerDetailContainer > section > section.energyDiagnosticContainer > div > article.GES > ul > li > span[tabindex]");
            ad = {
                ...ad,
                title: titleElement ? await titleElement.textContent() : '',
                pictureUrl: pictureUrlElement ? await pictureUrlElement[0] : '',
                pictureUrls: pictureUrlElement ? await Promise.all(pictureUrlElement) : [],
                description: descriptionElement ? await descriptionElement.textContent() : '',
                gas_certificate: gas_certificateElement ? await gas_certificateElement.textContent() : '',
            };
            await this.dataProcessingService.process([ad], 'logicimmo-crawler');
            await job.update({
                ...job.data,
                total_data_grabbed: job.data.total_data_grabbed + 1
            });
        });
        return new PlaywrightCrawler({
            ...logicimmoCrawlerOption,
            requestHandler: router,
            errorHandler: (_, error) => this.logger.error(error),
            failedRequestHandler: (context, error) => this.handleFailedRequest(job, context, error)
        }, logicimmoConfig)
    }

    protected async handleFailedRequest(job: Job, { request, proxyInfo }: any, error: Error) {
        await job.update({
            ...job.data,
            error_date: new Date(),
            status: 'failed',
            attempts_count: job.data['attempts_count'] + 1,
            failedReason: request.errorMessages?.slice(-1)[0] || error.message || 'Unknown error',
            failed_request_url: request.url || 'N/A',
            proxy_used: proxyInfo ? proxyInfo.url : 'N/A',
        });
    }
    protected async handleFailure(job: Job, stats: FinalStatistics) {
        if (job.data['status'] && job.data['status'] === 'failed') {
            await job.update({
                ...job.data,
                total_request: stats.requestsTotal,
                success_requests: stats.requestsFinished,
                failed_requests: stats.requestsFailed,
            })
            await job.moveToFailed(job.data['failedReason']);
            return;
        }
        if (stats.requestsTotal === 0) {
            await job.update({
                ...job.data,
                error_date: new Date(),
                status: 'failed',
                total_request: stats.requestsTotal,
                attempts_count: job.data['attempts_count'] + 1,
                failed_requests: stats.requestsFailed,
                failed_request_url: 'N/A',
                proxy_used: 'N/A',
                failedReason: 'Crawler did not start as expected'
            })
            await job.moveToFailed(job.data['failedReason']);
        }
    }
    protected async handleSuccess(job: Job, stats: FinalStatistics) {
        await job.update({
            ...job.data,
            success_date: new Date(),
            status: 'success',
            total_request: stats.requestsTotal,
            attempts_count: job.data['attempts_count'] + 1,
            success_requests: stats.requestsFinished,
            failed_requests: stats.requestsFailed,
        });
    }
    protected isSameDay(date1: Date, date2: Date) {
        return date1.getUTCFullYear() === date2.getUTCFullYear() &&
            date1.getUTCMonth() === date2.getUTCMonth() &&
            date1.getUTCDate() === date2.getUTCDate();
    }

    protected build_link(job: Job): string {
        return `https://www.logic-immo.com/vente-immobilier-${job.data.france_localities[job.data.localite_index]}/options/groupprptypesids=1,2,6,7,12,3,18,4,5,14,13,11,10,9,8/searchoptions=0,1,3/page=${job.data.list_page}/order=update_date_desc`;
    }
}
