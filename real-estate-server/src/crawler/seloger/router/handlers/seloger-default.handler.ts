import { Job } from "bull";
import { PlaywrightCrawlingContext } from "crawlee";
import { createCursor } from "ghost-cursor-playwright";
import { detectDataDomeCaptcha } from "src/crawler/utils/captcha.detect";
import { CRAWLER_ORIGIN } from "src/crawler/utils/enum";
import { scrollToTargetHumanWay } from "src/crawler/utils/human-behavior.util";
import { DataProcessingService } from "src/data-processing/data-processing.service";
import { interceptSelogerHttpResponse } from "../../preNavigation/preHooks.register";



export const selogerDefaultHandler = async (context: PlaywrightCrawlingContext, dataProcessingService: DataProcessingService, job: Job) => {
    const { page, closeCookieModals, waitForSelector, enqueueLinks, log } = context;
    let data_grabbed = 0;
    let { name, limit } = job.data.france_locality[job.data.REGION_REACHED];
    let { REGION_REACHED, PAGE_REACHED } = job.data;
    await page.waitForLoadState('load');
    await detectDataDomeCaptcha(context);
    await closeCookieModals();
    await return_after_error(job, context);
    const cursor = await createCursor(page);
    while (data_grabbed < limit) {
        await cursor.actions.randomMove();
        await waitForSelector('a[data-testid="gsl.uilib.Paging.nextButton"]').catch(async () => {
            await page.goBack({ waitUntil: 'load' });
            await page.goForward({ waitUntil: 'load' });
            await waitForSelector('a[data-testid="gsl.uilib.Paging.nextButton"]');
            await closeCookieModals().catch(() => { });
        });
        let ads: any;
        if (PAGE_REACHED === 1) {
            ads = await page.evaluate(() => Array.from(window['initialData']['cards']['list']).filter(card => card['cardType'] === 'classified'));
        } else {
            ads = await page.evaluate(() => window['crawled_ads'] || null);
        }
        if (!ads) throw new Error('No ads found');
        await dataProcessingService.process(ads, CRAWLER_ORIGIN.SELOGER);
        await page.evaluate(() => window['crawled_ads'] = null);
        data_grabbed += ads.length;
        await job.update({ ...job.data, total_data_grabbed: job.data.total_data_grabbed + ads.length });
        const nextButton = await page.$('a[data-testid="gsl.uilib.Paging.nextButton"]');
        const nextButtonPosition = await nextButton.boundingBox();
        await scrollToTargetHumanWay(context, nextButtonPosition.y);
        await page.mouse.move(nextButtonPosition.x - 10, nextButtonPosition.y - 10);
        await interceptSelogerHttpResponse(context);
        await nextButton.scrollIntoViewIfNeeded();
        await nextButton.click();
        await page.waitForTimeout(2000);
        await job.update({ ...job.data, PAGE_REACHED: PAGE_REACHED + 1 });
        PAGE_REACHED++;
        log.info(`Data grabbed: ${data_grabbed} of ${limit} for (${name})`);
    }
    // NEXT LOCALITY
    if (REGION_REACHED >= job.data.france_locality.length - 1) return;
    await job.update({ ...job.data, REGION_REACHED: REGION_REACHED + 1, PAGE_REACHED: 1 });
    await enqueueLinks({ urls: [build_link(job)] });
}


const build_link = (job: Job): string => {
    const { link } = job.data.france_locality[job.data.REGION_REACHED]
    const grouped_urls = link.map((l: string) => ({ divisions: [parseInt(l)] }))
    const string_urls = JSON.stringify(grouped_urls)
    return `https://www.seloger.com/list.htm?projects=2,5&types=2,4,1,13,9,3,14,12,11,10&natures=1,2,4&places=${string_urls}&sort=d_dt_crea&mandatorycommodities=0&privateseller=0&enterprise=0&houseboat=1&qsVersion=1.0&m=search_refine-redirection-search_results`
}



const return_after_error = async (job: Job, context: PlaywrightCrawlingContext): Promise<void> => {
    return;
}