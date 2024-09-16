import { Job } from "bull";
import { PlaywrightCrawlingContext } from "crawlee";
import { detectDataDomeCaptcha } from "src/crawler/utils/captcha.detect";


export const logicImmoDefaultHandler = async (context: PlaywrightCrawlingContext, job: Job) => {
    const { page, enqueueLinks, closeCookieModals, log } = context;
    await page.waitForLoadState('domcontentloaded');
    await detectDataDomeCaptcha(context, false);
    await closeCookieModals();
    await page.waitForTimeout(1200);
    const ads = await page.evaluate(() => window['thor']['dataLayer']['av_items']);
    if (!ads) throw new Error('No ads found');
    const ads_links = ads.map((ad: any) => `https://www.logic-immo.com/detail-vente-${ad.id}.htm`);
    if (job.data['LIMIT_REACHED'] === false) {
        log.info(`STARTING PAGE ${job.data.list_page} FOR ${job.data.localite_index} - ${job.data.france_localities[job.data.localite_index].link}`);
        await enqueueLinks({ urls: ads_links, label: 'ad-single-url' });
        await job.update({
            ...job.data,
            list_page: job.data.list_page + 1,
        });
        await enqueueLinks({ urls: [build_link(job)] });
        return;
    }
    if (job.data['localite_index'] < job.data['france_localities'].length - 1) {
        await job.update({
            ...job.data,
            LIMIT_REACHED: false,
            localite_index: job.data.localite_index + 1,
            list_page: 1,
        });
        await enqueueLinks({ urls: [build_link(job)] });
    }
}

const build_link = (job: Job): string => {
    return `https://www.logic-immo.com/vente-immobilier-${job.data.france_localities[job.data.localite_index].link}/options/groupprptypesids=1,2,6,7,12,3,18,4,5,14,13,11,10,9,8/searchoptions=0,1/page=${job.data.list_page}/order=update_date_desc`;
}