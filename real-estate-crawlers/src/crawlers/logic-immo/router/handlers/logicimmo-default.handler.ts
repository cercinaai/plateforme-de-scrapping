import { Job } from "bullmq";
import { PlaywrightCrawlingContext } from "crawlee";
import { detectDataDomeCaptcha } from "../../../../utils/captcha.detect";
import { initLogger } from "../../../../config/logger.config";
import { CRAWLER_ORIGIN } from "../../../../utils/enum";
import { build_link } from "../logicimmo.router";

const logger = initLogger(CRAWLER_ORIGIN.LOGICIMMO);


export const logicImmoDefaultHandler = async (job: Job, context: PlaywrightCrawlingContext) => {
    const { page, enqueueLinks, closeCookieModals } = context;
    let { name, limit } = job.data.france_locality[job.data.REGION_REACHED];
    let { DATA_REACHED, REGION_REACHED, PAGE_REACHED } = job.data;
    await page.waitForLoadState('load');
    await detectDataDomeCaptcha(context);
    await closeCookieModals();
    await page.click('#didomi-notice-agree-button').catch(() => { });
    const ads = await page.evaluate(() => window['thor']['dataLayer']['av_items']);
    if (!ads) throw new Error('No ads found');
    const ads_links = ads.map((ad: any) => `https://www.logic-immo.com/detail-vente-${ad.id}.htm`);
    if (DATA_REACHED < limit) {
        await enqueueLinks({ urls: ads_links, label: 'ad-single-url' });
        await job.updateData({ ...job.data, PAGE_REACHED: PAGE_REACHED + 1 })
        DATA_REACHED += ads_links.length;
        await job.updateData({ ...job.data, DATA_REACHED: DATA_REACHED });
        logger.info(`Data grabbed: ${DATA_REACHED} of ${limit} for (${name}) in page (${PAGE_REACHED})`);
        await enqueueLinks({ urls: [build_link(job)] });
        return;
    }
    if (REGION_REACHED >= job.data.france_locality.length - 1) return;
    await job.updateData({ ...job.data, REGION_REACHED: REGION_REACHED + 1, PAGE_REACHED: 1, DATA_REACHED: 0 });
    await enqueueLinks({ urls: [build_link(job)] });
}