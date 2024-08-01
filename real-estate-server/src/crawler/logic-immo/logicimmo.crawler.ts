import { Process, Processor } from "@nestjs/bull";
import { Logger, Scope } from "@nestjs/common";
import { ProxyService } from "../proxy.service";
import { DataProcessingService } from "src/data-processing/data-processing.service";
import { Job } from "bull";
import { FinalStatistics, PlaywrightCrawler } from "crawlee";
import { logicimmoConfig, logicimmoCrawlerOption } from "./logicimmo.config";
import { Page } from "playwright";
import { InjectModel } from "@nestjs/mongoose";
import { Ad } from "src/models/ad.schema";
import { Model } from "mongoose";


@Processor({ name: 'crawler', scope: Scope.DEFAULT })
export class LogicImmoCrawler {

    private readonly logger = new Logger(LogicImmoCrawler.name);
    private readonly LIMIT_PAGE = 20;
    constructor(private dataProcessingService: DataProcessingService, @InjectModel(Ad.name) private adModel: Model<Ad>) { }

    @Process('logicimmo-crawler')
    async start(job: Job) {
        let localite_index = 0;
        let list_page = 1;
        const france_localities = ['ile-de-france,1_0', 'alsace,10_0', 'aquitaine,15_0', 'Auvergne,19_0', 'Bretagne,13_0',
            'centre,5_0', 'Bourgogne,7_0', 'champagne-ardenne,2_0', 'corse,22_0',
            'franche-comte,11_0', 'languedoc-roussillon,20_0', 'limousin,17_0', 'lorraine,9_0',
            'basse-normandie,6_0', 'midi-pyrenees,16_0', 'nord-pas-de-calais,8_0', 'pays-de-la-loire,12_0',
            'picardie,3_0', 'poitou-charentes,14_0', 'provence-alpes-cote-d-azur,21_0', 'rhone-alpes,18_0', 'haute-normandie,4_0'];
        let crawler = new PlaywrightCrawler({
            ...logicimmoCrawlerOption,
            requestHandler: async ({ page, enqueueLinks, closeCookieModals, waitForSelector }) => {
                await closeCookieModals();
                await page.waitForTimeout(1200);
                const ads = await page.evaluate(() => {
                    return window['thor']['dataLayer']['av_items']
                });
                if (await this.stop_crawler(ads, page) === true && localite_index === france_localities.length - 1) {
                    this.logger.log("Found ads older than check_date. Stopping the crawler.");
                    return;
                }
                if (await this.stop_crawler(ads, page) === true && localite_index < france_localities.length - 1) {
                    this.logger.log(`SKIPPIN THIS LOCALITY ${france_localities[localite_index]}`);
                    localite_index++;
                    list_page = 1;
                    await enqueueLinks({
                        urls: [`https://www.logic-immo.com/vente-immobilier-${france_localities[localite_index]}/options/groupprptypesids=1,2,6,7,12,3,18,4,5,14,13,11,10,9,8/searchoptions=0,1,3/page=${list_page}/order=update_date_desc`],
                        label: 'next_page'
                    })
                    return
                }
                let formatted_ads = await this.format_ads(ads, page);
                await this.dataProcessingService.process(formatted_ads, 'logicimmo-crawler');
                // CHECK IF LIMIT PAGE IS REACHED
                if (await this.limitPageReached(list_page) === false) {
                    let nextPage = await page.$('li[data-position="next"]');
                    if (nextPage) {
                        list_page++;
                        await enqueueLinks({
                            urls: [`https://www.logic-immo.com/vente-immobilier-${france_localities[localite_index]}/options/groupprptypesids=1,2,6,7,12,3,18,4,5,14,13,11,10,9,8/searchoptions=0,1,3/page=${list_page}/order=update_date_desc`],
                            label: 'next_page'
                        })
                        return;
                    }
                }
                if (localite_index < france_localities.length - 1) {
                    localite_index++;
                    list_page = 1;
                    await enqueueLinks({
                        urls: [`https://www.logic-immo.com/vente-immobilier-${france_localities[localite_index]}/options/groupprptypesids=1,2,6,7,12,3,18,4,5,14,13,11,10,9,8/searchoptions=0,1,3/page=${list_page}/order=update_date_desc`],
                        label: 'next_page'
                    })
                }
            },
            failedRequestHandler: async ({ request, proxyInfo, log }, error) => {
                await job.update({
                    job_id: job.id.toLocaleString(),
                    error_date: new Date(),
                    crawler_origin: 'logic-immo',
                    status: 'failed',
                    failedReason: request.errorMessages[-1] || error.message || 'Unknown error',
                    failed_request_url: request.url,
                    proxy_used: proxyInfo.url
                });
            }
        }, logicimmoConfig);

        let stat: FinalStatistics = await crawler.run([`https://www.logic-immo.com/vente-immobilier-${france_localities[localite_index]}/options/groupprptypesids=1,2,6,7,12,3,18,4,5,14,13,11,10,9,8/searchoptions=0,1,3/page=${list_page}/order=update_date_desc`]);
        await crawler.teardown();
        if (stat.requestsFailed > 0) {
            await job.moveToFailed(new Error(`Failed requests: ${stat.requestsFailed}`), false);
            return;
        }
        await job.update({
            success_date: new Date(),
            crawler_origin: 'logic-immo',
            status: 'success',
            total_request: stat.requestsTotal,
            success_requests: stat.requestsFinished,
            failed_requests: stat.requestsFailed,
        });
    }

    private escapeId(id: string) {
        return id.replace(/([#;&,.+*~':"!^$[\]()=>|/@])/g, '\\$1').replace(/^\d/, '\\3$& ');
    }

    private async format_ads(ads: any[], page: Page): Promise<any[]> {
        return await Promise.all(ads.map(async (ad: any) => {
            let id = this.escapeId(ad.id);
            let pictureUrl = await page.$(`#${id} > div.announceContent.announceSearch > div.leftContent > picture > img`);
            let description = await page.$(`#${id} > div.announceContent.announceSearch > div.announceDtl > div.announceDtlDescription`);
            let agencyName = await page.$(`#${id} > div.topAnnounce.announceSearch > div > span > a`);
            let agencyUrl = await page.$(`#${id} > div.topAnnounce.announceSearch > div > a`);
            let ad_title = await page.$(`#${id} > span.announceDtlInfosPropertyType`);
            return {
                ...ad,
                title: ad_title ? await ad_title.textContent() : '',
                pictureUrl: pictureUrl ? await pictureUrl.getAttribute('src') : '',
                description: description ? await description.textContent() : '',
                agencyName: agencyName ? await agencyName.textContent() : '',
                agencyUrl: agencyUrl ? await agencyUrl.getAttribute('href') : ''
            }
        }));
    }

    private async stop_crawler(ads: any[], page: Page): Promise<boolean> {
        const ids = ads.map((ad) => ad.id.toString());
        const existAd = await this.adModel.find({ adId: { $in: ids }, origin: 'logic-immo' });
        if (!existAd || existAd.length === 0) {
            return false;
        }
        if (existAd.length < ids.length) {
            // INSERTED NEW ADS AND STOP THE CRAWLER
            const ads_to_insert = ads.filter((ad) => !existAd.find((existAd) => existAd.adId === ad.id.toString()));
            const format_ads = await this.format_ads(ads_to_insert, page);
            await this.dataProcessingService.process(format_ads, 'logicimmo-crawler');
            return true;
        }
        if (existAd.length === ids.length) return true;
    }

    private async limitPageReached(current_page: number): Promise<boolean> {
        // CHECK IF LOGIC-IMMO ADS IS EMPTY OR NOT
        let logic_immo_ads = await this.adModel.countDocuments({ origin: 'logic-immo' });
        if (logic_immo_ads > 0) return false;
        if (current_page <= this.LIMIT_PAGE) return false;
        return true;
    }

}