import { Job } from "bullmq";
import { PlaywrightCrawlingContext } from "crawlee";
import { createCursor } from "ghost-cursor-playwright";
import { detectDataDomeCaptcha } from "../../../../utils/captcha.detect";
import { ingestData } from "../../../../data-ingestion/data.ingestion";
import { CRAWLER_ORIGIN } from "../../../../utils/enum";
import { ElementHandle } from "playwright";
import { scrollToTargetHumanWay } from '../../../../utils/human-behavior.util';

export const boncoinDefaultHandler = async (job: Job, context: PlaywrightCrawlingContext) => {
    const { page, closeCookieModals, log, waitForSelector, enqueueLinks } = context;
    let data_grabbed = 0;
    let { name, limit } = job.data.france_locality[job.data.REGION_REACHED];
    let { REGION_REACHED, PAGE_REACHED } = job.data;
    await page.waitForLoadState('load');
    await detectDataDomeCaptcha(context, true);
    await closeCookieModals();
    // PAGE LOOP
    let ads: any;
    while (data_grabbed < limit) {
        await waitForSelector("a[title='Page suivante']", 10000);
        const cursor = await createCursor(page as any);
        await cursor.actions.randomMove();
        if (PAGE_REACHED === 1) {
            let data = await page.$("script[id='__NEXT_DATA__']");
            ads = JSON.parse(await data?.textContent() as string)["props"]["pageProps"]["searchData"]["ads"];
        }
        if (!ads) throw new Error('No ads found');
        await ingestData(ads, CRAWLER_ORIGIN.BONCOIN);
        data_grabbed += ads.length;
        await job.updateData({ ...job.data, total_data_grabbed: job.data.total_data_grabbed + ads.length });
        ads = null
        const nextButton = await page.$("a[title='Page suivante']") as ElementHandle<SVGElement | HTMLElement>;
        const nextButtonPosition = await nextButton.boundingBox() as { x: number, y: number };
        await scrollToTargetHumanWay(context, nextButtonPosition?.y);
        await page.mouse.move(nextButtonPosition.x - 10, nextButtonPosition.y - 10);
        ads = await interceptBoncoinHttpResponse(context);
        await page.waitForTimeout(2000);
        log.info(`Data grabbed: ${data_grabbed} of ${limit} for (${name})`);
        PAGE_REACHED++;
    }
    if (REGION_REACHED >= job.data.france_locality.length - 1) return;
    await job.updateData({ ...job.data, REGION_REACHED: REGION_REACHED + 1, PAGE_REACHED: 1 });
    await enqueueLinks({ urls: [build_link(job)] });
}


export const build_link = (job: Job): string => {
    const { link } = job.data.france_locality[job.data.REGION_REACHED]
    return `https://www.leboncoin.fr/recherche?category=9&locations=${link}&real_estate_type=1,2,3,4,5&immo_sell_type=old,new,viager&owner_type=pro`
}

const interceptBoncoinHttpResponse = async (context: PlaywrightCrawlingContext): Promise<any> => {
    const { page, log } = context;
    const listen_response = page.waitForResponse(async (response) => {
        const url = response.url();
        if (!url.includes('https://api.leboncoin.fr/finder/search')) return false;
        const body = await response.json();
        if (!body['ads']) return false;
        return true;
    });
    await page.click("a[title='Page suivante']");
    const res = await listen_response;
    const data = await res.json();
    log.info('Boncoin http response intercepted!');
    console.log(data);
    return data['ads'];
}   