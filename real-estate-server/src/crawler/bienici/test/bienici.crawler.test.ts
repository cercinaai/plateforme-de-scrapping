import { Configuration, createPlaywrightRouter, LogLevel, PlaywrightCrawler } from "crawlee";
import { bieniciCrawlerOption } from "../../../config/playwright.config";
import dotenv from 'dotenv';
import { save_files } from "../../../data-processing/test/save-file.test";

dotenv.config({ path: 'real-estate.env' });

const PAGE_LIMIT = 20
let page_reached = 1;
const router = createPlaywrightRouter();

router.addDefaultHandler(async (context) => {
    const { page, enqueueLinks } = context;
    await page.waitForLoadState('networkidle');
    const ads = await page.evaluate(() => window['crawled_ads']);
    const baseUrl = 'https://www.bienici.com';
    const photo_urls = ads.flatMap((ad: any) => ad.photos);
    await save_files(photo_urls[0].url);
    // const links_urls = await Promise.all(ads.map(async (ad: any) => {
    //     const adLinkHtml = await page.$(`article[data-id="${ad.id}"]  a`);
    //     const adLink = await adLinkHtml?.getAttribute('href');
    //     return adLink ? `${baseUrl}${adLink}` : ''
    // }));
    // await enqueueLinks({ urls: links_urls, label: 'ad-single-url' });
    // if (page_reached >= PAGE_LIMIT) return;
    // page_reached += 1;
    // const nextPageHtml = await page.$("#searchResultsContainer > div.vue-pagination.pagination > div.pagination__nav-buttons > a.pagination__go-forward-button");
    // const nextPage = await nextPageHtml?.getAttribute('href');
    // if (nextPage) {
    //     await enqueueLinks({ urls: [`https://www.bienici.com${nextPage}`] });
    // }
});
router.addHandler('ad-single-url', async (context) => {
    const { page } = context;
    await page.waitForLoadState('domcontentloaded');
});

const bieniciCrawler = new PlaywrightCrawler({
    ...bieniciCrawlerOption,
    preNavigationHooks: [async (context) => {
        const { page, log } = context;
        page.on('response', async (response) => {
            const url = response.url();
            if (url.match(/realEstateAd\.json\?id=.*$/)) {
                // SINGLE AD PAGE
                let body = await response.json();
                if (body) {
                    log.info('AD FOUND');
                }
            }
            if (url.match(/realEstateAds\.json\?filters=.*$/)) {
                // LIST PAGE
                let body = await response.json();
                if (body) {
                    log.info('LIST FOUND');
                    let ads = body.realEstateAds || [];
                    await page.evaluate((ads) => { window['crawled_ads'] = ads; }, ads);
                }
            }
        })
    }],
    errorHandler: (context, error) => { context.log.error(error.message) },
    requestHandler: router,
}, new Configuration({
    logLevel: LogLevel.INFO,
    purgeOnStart: true,
    persistStorage: false,
    storageClientOptions: {
        persistStorage: false,
        writeMetadata: false,
    },
    headless: false,
}));


const test = async () => {
    await bieniciCrawler.run(['https://www.bienici.com/recherche/achat/france/maisonvilla,appartement,parking,terrain,loft,commerce,batiment,chateau,local,bureau,hotel,autres?mode=liste&tri=publication-desc']);
    await bieniciCrawler.teardown();
}

test().then(() => console.log('TEST FINISHED'))