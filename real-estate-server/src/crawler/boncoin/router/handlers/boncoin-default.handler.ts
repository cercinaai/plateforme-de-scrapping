import { Job } from "bull";
import { PlaywrightCrawlingContext } from "crawlee";
import { createCursor } from "ghost-cursor-playwright";
import { detectDataDomeCaptcha } from "src/crawler/utils/captcha.detect";
import { isSameDayOrBefore } from "src/crawler/utils/date.util";
import { CRAWLER_ORIGIN } from "src/crawler/utils/enum";
import { scrollToTargetHumanWay } from "src/crawler/utils/human-behavior.util";
import { DataProcessingService } from "src/data-processing/data-processing.service";
import { interceptBoncoinHttpResponse } from "../../preNavigation/preHooks.register";


export const boncoinDefaultHandler = async (context: PlaywrightCrawlingContext, dataProcessingService: DataProcessingService, job: Job) => {
    const { page, closeCookieModals, log, waitForSelector, enqueueLinks } = context;
    let data_grabbed = 0;
    let { name, limit } = job.data.france_locality[job.data.REGION_REACHED];
    let { REGION_REACHED, PAGE_REACHED } = job.data;
    await page.waitForLoadState('load');
    await detectDataDomeCaptcha(context, true);
    await closeCookieModals();
    // PAGE LOOP
    while (data_grabbed < limit) {
        await waitForSelector("a[title='Page suivante']", 10000);
        const cursor = await createCursor(page);
        await cursor.actions.randomMove();
        let ads: any;
        if (PAGE_REACHED === 1) {
            let data = await page.$("script[id='__NEXT_DATA__']");
            ads = JSON.parse(await data?.textContent() as string)["props"]["pageProps"]["searchData"]["ads"];
        } else {
            ads = await page.evaluate(() => window['crawled_ads']);
        }
        if (!ads) throw new Error('No ads found');
        await dataProcessingService.process(ads, CRAWLER_ORIGIN.BONCOIN);
        data_grabbed += ads.length;
        await job.update({ ...job.data, total_data_grabbed: job.data.total_data_grabbed + ads.length });
        const nextButton = await page.$("a[title='Page suivante']");
        const nextButtonPosition = await nextButton.boundingBox();
        await scrollToTargetHumanWay(context, nextButtonPosition.y);
        await page.mouse.move(nextButtonPosition.x - 10, nextButtonPosition.y - 10);
        await interceptBoncoinHttpResponse(context);
        await page.click("a[title='Page suivante']");
        await page.waitForTimeout(2000);
        log.info(`Data grabbed: ${data_grabbed} of ${limit} for (${name})`);
        PAGE_REACHED++;
    }
    if (REGION_REACHED >= job.data.france_locality.length - 1) return;
    await job.update({ ...job.data, REGION_REACHED: REGION_REACHED + 1, PAGE_REACHED: 1 });
    await enqueueLinks({ urls: [build_link(job)] });
}


const build_link = (job: Job): string => {
    const { link } = job.data.france_locality[job.data.REGION_REACHED]
    return `https://www.leboncoin.fr/recherche?category=9&locations=${link}&real_estate_type=1,2,3,4,5&immo_sell_type=old,new,viager&owner_type=pro`
}