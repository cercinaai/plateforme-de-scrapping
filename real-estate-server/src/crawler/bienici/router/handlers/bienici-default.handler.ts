import { Job } from "bull";
import { PlaywrightCrawlingContext } from "crawlee";
import { Page } from "playwright";
import { isSameDayOrBefore } from "src/crawler/utils/date.util";
import { DataProcessingService } from "src/data-processing/data-processing.service";

export const bieniciDefaultHandler = async (context: PlaywrightCrawlingContext, dataProcessingService: DataProcessingService, job: Job) => {
    const { page, enqueueLinks, log } = context;
    await page.waitForLoadState('networkidle');
    if (job.data.total_data_grabbed >= job.data.AD_LIMIT) {
        log.info("Limit reached. Stopping the crawler.");
        return;
    }
    const ads = await filterAds(page, job.data.check_date);
    if (ads.length === 0) {
        log.info("Found ads older than check_date. Stopping the crawler.");
        return;
    }
    const links_urls = await extract_links(ads, page);
    await enqueueLinks({ urls: links_urls, label: 'ad-single-url' });
    const nextPageHtml = await page.$("#searchResultsContainer > div.vue-pagination.pagination > div.pagination__nav-buttons > a.pagination__go-forward-button");
    const nextPage = await nextPageHtml?.getAttribute('href');
    if (!nextPage) return;
    await enqueueLinks({ urls: [`https://www.bienici.com${nextPage}`] });
}


const filterAds = async (page: Page, check_date: Date) => {
    const ads = await page.evaluate(() => window['crawled_ads']);
    if (!ads || ads.length === 0) {
        throw new Error('No ads found');
    }
    return ads.filter((ad: any) => isSameDayOrBefore({ target_date: new Date(ad.modificationDate), check_date, returnDays: 1 }));
}

const extract_links = (ads: any[], page: Page): Promise<string[]> => {
    const baseUrl = 'https://www.bienici.com';
    return Promise.all(ads.map(async (ad: any) => {
        const adLinkHtml = await page.$(`article[data-id="${ad.id}"]  a`);
        const adLink = await adLinkHtml?.getAttribute('href');
        return adLink ? `${baseUrl}${adLink}` : ''
    }));
}