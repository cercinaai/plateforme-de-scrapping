import { Job } from "bullmq";
import { PlaywrightCrawlingContext } from "crawlee";
import { CRAWLER_ORIGIN } from "../../../../utils/enum";
import { initLogger } from "../../../../config/logger.config";
import { Page } from "playwright";

const logger = initLogger(CRAWLER_ORIGIN.BIENICI);

export const bieniciDefaultHandler = async (job: Job, context: PlaywrightCrawlingContext) => {
    const { page, enqueueLinks, waitForSelector, closeCookieModals, ads_list_response } = context;
    let { total_data_grabbed, AD_LIMIT } = job.data;
    if (total_data_grabbed >= AD_LIMIT) {
        logger.info('Limit reached. Stopping the crawler.');
        return;
    }
    const res = await ads_list_response as Response;
    const data = await res.json();
    const ads = data['realEstateAds'];
    if (!ads) throw new Error('No ads found');
    await closeCookieModals();
    await waitForSelector('#searchResultsContainer > div.vue-pagination.pagination > div.pagination__nav-buttons > a.pagination__go-forward-button');
    const links_urls = await extract_links(ads, page);
    await enqueueLinks({ urls: links_urls, label: 'ad-single-url' });
    total_data_grabbed += links_urls.length;
    job.updateData({ ...job.data, total_data_grabbed: total_data_grabbed });
    logger.info(`Data grabbed: ${total_data_grabbed} of ${AD_LIMIT}`);
    const nextPageHtml = await page.$("#searchResultsContainer > div.vue-pagination.pagination > div.pagination__nav-buttons > a.pagination__go-forward-button");
    const nextPage = await nextPageHtml?.getAttribute('href');
    if (!nextPage) return;
    await job.updateData({ ...job.data, PAGE_REACHED: job.data.PAGE_REACHED + 1 });
    await enqueueLinks({ urls: [`https://www.bienici.com${nextPage}`] });
}




const extract_links = async (ads: any, page: Page): Promise<string[]> => {
    const baseUrl = 'https://www.bienici.com';
    const links = await Promise.all(ads.map(async (ad: any) => {
        const adLinkHtml = await page.$(`article[data-id="${ad.id}"]  a`);
        const adLink = await adLinkHtml?.getAttribute('href');
        return adLink ? `${baseUrl}${adLink}` : null;
    }));
    return links.filter((link: any) => link !== null);
}