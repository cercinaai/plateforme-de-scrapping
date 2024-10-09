import { Job } from "bullmq";
import { PlaywrightCrawlingContext } from "crawlee";
import { detectDataDomeCaptcha } from '../../../../utils/captcha.detect';
import { createCursor } from "ghost-cursor-playwright";
import { CRAWLER_ORIGIN } from "../../../../utils/enum";
import { scrollToTargetHumanWay } from '../../../../utils/human-behavior.util';
import { ingestData } from '../../../../data-ingestion/data.ingestion';
import { ElementHandle } from "playwright";
import { build_link } from "../seloger.router";
import { initLogger } from "../../../../config/logger.config";

const logger = initLogger(CRAWLER_ORIGIN.SELOGER);


export const selogerDefaultHandler = async (job: Job, context: PlaywrightCrawlingContext) => {
    const { page, closeCookieModals, waitForSelector, enqueueLinks } = context;
    let { DATA_REACHED } = job.data;
    let { name, limit } = job.data.france_locality[job.data.REGION_REACHED];
    let { REGION_REACHED, PAGE_REACHED } = job.data;
    await page.waitForLoadState('load');
    await detectDataDomeCaptcha(context);
    await closeCookieModals();
    const cursor = await createCursor(page as any);
    let ads: any;
    while (DATA_REACHED < limit) {
        await waitForSelector('a[data-testid="gsl.uilib.Paging.nextButton"]').catch(async () => {
            await page.goBack({ waitUntil: 'load' });
            await page.goForward({ waitUntil: 'load' });
            await waitForSelector('a[data-testid="gsl.uilib.Paging.nextButton"]');
            await closeCookieModals().catch(() => { });
        });
        await cursor.actions.randomMove();
        if (PAGE_REACHED === 1) {
            ads = await page.evaluate(() => Array.from(window['initialData']['cards']['list']).filter((card: any) => card['cardType'] === 'classified'));
        }
        if (!ads) throw new Error('No ads found');
        await ingestData(ads, CRAWLER_ORIGIN.SELOGER);
        DATA_REACHED += ads.length;
        let ads_numbers = ads.length;
        ads = null;
        const nextButton = await page.$('a[data-testid="gsl.uilib.Paging.nextButton"]') as ElementHandle<SVGElement | HTMLElement>;
        const nextButtonPosition = await nextButton.boundingBox() as { x: number, y: number };
        await scrollToTargetHumanWay(context, nextButtonPosition.y);
        await page.mouse.move(nextButtonPosition.x - 10, nextButtonPosition.y - 10);
        ads = await interceptSelogerHttpResponse(context);
        await page.waitForTimeout(2000);
        logger.info(`Data grabbed: ${DATA_REACHED} of ${limit} for (${name}) in page (${PAGE_REACHED})`);
        PAGE_REACHED++;
        await job.updateData({ ...job.data, PAGE_REACHED: PAGE_REACHED, DATA_REACHED: DATA_REACHED, total_data_grabbed: job.data.total_data_grabbed + ads_numbers });
    }
    if (REGION_REACHED >= job.data.france_locality.length - 1) return;
    await job.updateData({ ...job.data, DATA_REACHED: 0, REGION_REACHED: REGION_REACHED + 1, PAGE_REACHED: 1 });
    await enqueueLinks({ urls: [build_link(job)] });
}


const interceptSelogerHttpResponse = async (context: PlaywrightCrawlingContext): Promise<any> => {
    const { page } = context;
    const listen_response = page.waitForResponse(async (response) => {
        const url = response.url();
        if (!url.includes('https://www.seloger.com/search-bff/api/externaldata')) return false;
        const body = await response.json();
        if (!body || !body['listingData'] || !body['listingData']['cards']) return false;
        return true;
    });
    await page.click('a[data-testid="gsl.uilib.Paging.nextButton"]');
    const res = await listen_response;
    const data = await res.json();
    return data['listingData']['cards'].filter((card: any) => card['type'] === 0).map((card: any) => card['listing']);
}