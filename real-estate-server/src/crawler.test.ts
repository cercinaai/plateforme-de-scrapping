import { Configuration, LogLevel, PlaywrightCrawler, RouterHandler } from "crawlee";
import { bieniciCrawlerOption } from "./config/playwright.config";

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
                    log.info('AD FOUND', body);
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
    requestHandler: async (context) => {
        const { page, enqueueLinks } = context;
        await page.waitForLoadState('networkidle');
        const ads = await page.evaluate(() => window['crawled_ads']);
        const baseUrl = 'https://www.bienici.com';
        const links_urls = await Promise.all(ads.map(async (ad: any) => {
            const adLinkHtml = await page.$(`article[data-id="${ad.id}"]  a`);
            const adLink = await adLinkHtml?.getAttribute('href');
            return adLink ? `${baseUrl}${adLink}` : ''
        }));
        await enqueueLinks({ urls: links_urls, label: 'ad-single-url' });
        const nextPageHtml = await page.$("#searchResultsContainer > div.vue-pagination.pagination > div.pagination__nav-buttons > a.pagination__go-forward-button");
        const nextPage = await nextPageHtml?.getAttribute('href');
        if (nextPage) {
            await enqueueLinks({ urls: [`https://www.bienici.com${nextPage}`] });
        }
    },
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

const main = async () => {
    await bieniciCrawler.run(['https://www.bienici.com/recherche/achat/france/maisonvilla,appartement,parking,terrain,loft,commerce,batiment,chateau,local,bureau,hotel,autres?mode=liste&tri=publication-desc']);
    await bieniciCrawler.teardown();
}

main().then(() => console.log('DONE'));
