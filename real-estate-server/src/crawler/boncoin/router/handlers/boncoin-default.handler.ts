import { Job } from "bull";
import { PlaywrightCrawlingContext } from "crawlee";
import { createCursor } from "ghost-cursor-playwright";
import { bypassDataDomeCaptchaByCapSolver } from "src/crawler/utils/captcha.bypass";
import { detectDataDomeCaptcha } from "src/crawler/utils/captcha.detect";
import { isSameDayOrBefore } from "src/crawler/utils/date.util";
import { CRAWLER_ORIGIN } from "src/crawler/utils/enum";
import { scrollToTargetHumanWay } from "src/crawler/utils/human-behavior.util";
import { DataProcessingService } from "src/data-processing/data-processing.service";


export const boncoinDefaultHandler = async (context: PlaywrightCrawlingContext, dataProcessingService: DataProcessingService, job: Job) => {
    const { page, closeCookieModals, log, waitForSelector, enqueueLinks } = context;
    let { name, limit, data_grabbed } = job.data.france_locality[job.data.REGION_REACHED];
    let { REGION_REACHED, PAGE_REACHED } = job.data;
    await detectDataDomeCaptcha(context);
    await closeCookieModals();
    await waitForSelector("a[title='Page suivante']", 10000);
    // PAGE LOOP
    while (data_grabbed < limit) {
        const cursor = await createCursor(page);
        await cursor.actions.randomMove();
        let ads: any;
        if (PAGE_REACHED === 1) {
            let data = await page.$("script[id='__NEXT_DATA__']");
            ads = JSON.parse(await data?.textContent() as string)["props"]["pageProps"]["searchData"]["ads"];
        } else {
            ads = await page.evaluate(() => window['crawled_ads']);
        }
        let date_filter_content = Array.from(ads).filter((ad) => isSameDayOrBefore({ target_date: new Date(ad["index_date"]), check_date: job.data.check_date, returnDays: 1 }));
        if (date_filter_content.length === 0) {
            log.info("Found ads older than check_date. Passing Into Next Region.");
            break;
        }
        if (ads.length > date_filter_content.length) {
            await dataProcessingService.process(date_filter_content, CRAWLER_ORIGIN.BONCOIN);
            await job.update({ ...job.data, data_grabbed: data_grabbed + date_filter_content.length });
            log.info("Found ads older than check_date. Passing Into Next Region.");
            break;
        }
        await dataProcessingService.process(date_filter_content, CRAWLER_ORIGIN.BONCOIN);
        await job.update({ ...job.data, data_grabbed: data_grabbed + date_filter_content.length });
        const nextButton = await page.$("a[title='Page suivante']");
        const nextButtonPosition = await nextButton.boundingBox();
        await scrollToTargetHumanWay(context, nextButtonPosition.y);
        await page.click("a[title='Page suivante']");
        await page.waitForTimeout(2000);
        log.info(`Scraped ${data_grabbed} ads from ${name}.`);
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