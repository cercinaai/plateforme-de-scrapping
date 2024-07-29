import { Process, Processor } from "@nestjs/bull";
import { Scope } from "@nestjs/common";
import { ProxyService } from "../proxy.service";
import { DataProcessingService } from "src/data-processing/data-processing.service";
import { Job } from "bull";
import { PlaywrightCrawler } from "crawlee";
import { logicimmoConfig, logicimmoCrawlerOption } from "./logicimmo.config";


@Processor({ name: 'crawler', scope: Scope.DEFAULT })
export class LogicImmoCrawler {

    constructor(private dataProcessingService: DataProcessingService, private proxyService: ProxyService) { }

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
            requestHandler: async ({ page, enqueueLinks, log, closeCookieModals, waitForSelector }) => {
                await closeCookieModals();
                await page.waitForTimeout(1200);
                const ads = await page.evaluate(() => {
                    return window['thor']['dataLayer']['av_items']
                });
                const formatted_ads = await Promise.all(ads.map(async (ad: any) => {
                    let id = this.escapeId(ad.id);
                    let pictureUrl = await page.$(`#${id} > div.announceContent.announceSearch > div.leftContent > picture > img`);
                    let description = await page.$(`#${id} > div.announceContent.announceSearch > div.announceDtl > div.announceDtlDescription`);
                    let agencyName = await page.$(`#${id} > div.topAnnounce.announceSearch > div > span > a`);
                    let agencyUrl = await page.$(`#${id} > div.topAnnounce.announceSearch > div > a`);
                    return {
                        ...ad,
                        pictureUrl: pictureUrl ? await pictureUrl.getAttribute('src') : '',
                        description: description ? await description.textContent() : '',
                        agencyName: agencyName ? await agencyName.textContent() : '',
                        agencyUrl: agencyUrl ? await agencyUrl.getAttribute('href') : ''
                    }
                }));
                await this.dataProcessingService.process(formatted_ads, 'logicimmo-crawler');
                let nextPage = await page.$('li[data-position="next"]');
                if (nextPage) {
                    list_page++;
                    await enqueueLinks({
                        urls: [`https://www.logic-immo.com/vente-immobilier-${france_localities[localite_index]}/options/groupprptypesids=1,2,6,7,12,3,18,4,5,14,13,11,10,9,8/searchoptions=0,1,3/page=${list_page}/order=update_date_desc`],
                        label: 'next_page'
                    })
                    return;
                }
                if (localite_index < france_localities.length - 1) {
                    localite_index++;
                    list_page = 1;
                    await enqueueLinks({
                        urls: [`https://www.logic-immo.com/vente-immobilier-${france_localities[localite_index]}/options/groupprptypesids=1,2,6,7,12,3,18,4,5,14,13,11,10,9,8/searchoptions=0,1,3/page=${list_page}/order=update_date_desc`],
                        label: 'next_page'
                    })
                    return;
                }
            },
            failedRequestHandler: async ({ request, proxyInfo, crawler, log }, error) => {
                await job.moveToFailed(error);
            }
        }, logicimmoConfig);

        await crawler.run([`https://www.logic-immo.com/vente-immobilier-${france_localities[localite_index]}/options/groupprptypesids=1,2,6,7,12,3,18,4,5,14,13,11,10,9,8/searchoptions=0,1,3/page=${list_page}/order=update_date_desc`]);
        if (!crawler.requestQueue.isEmpty()) {
            await crawler.requestQueue.drop();
        }
        await crawler.teardown();
        await job.update({
            success_date: new Date(),
            crawler_origin: 'logic-immo',
            status: 'success',
            success_requests: crawler.stats.state.requestsFinished,
            failed_requests: crawler.stats.state.requestsFailed
        });
        await job.moveToCompleted("success");
    }

    private escapeId(id: string) {
        return id.replace(/([#;&,.+*~':"!^$[\]()=>|/@])/g, '\\$1').replace(/^\d/, '\\3$& ');
    }
}