import { Configuration, createPlaywrightRouter, LogLevel, PlaywrightCrawler, RouterHandler } from "crawlee";
import { bieniciCrawlerOption, logicimmoCrawlerOption } from "./config/playwright.config";

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
const logicImmoRouter = createPlaywrightRouter();

logicImmoRouter.addDefaultHandler(async (context) => {
    const { page, enqueueLinks, closeCookieModals } = context;
    await closeCookieModals();
    await page.waitForTimeout(1200);
    const ads = await page.evaluate(() => window['thor']['dataLayer']['av_items']);
    const ads_links = ads.map((ad: any) => `https://www.logic-immo.com/detail-vente-${ad.id}.htm`);
    await enqueueLinks({ urls: ads_links, label: 'ad-single-url' });
});

logicImmoRouter.addHandler('ad-single-url', async (context) => {
    const { page, log } = context;
    const current_date = new Date();
    const previousDay = new Date(current_date);
    previousDay.setDate(previousDay.getDate() - 1);

    await page.waitForLoadState('networkidle');
    const adNotFound = await page.$('body > main > .errorPageBox');
    if (adNotFound) {
        log.info('AD NOT FOUND');
        return;
    }
    const ad_date_brute = await (await page.$('.offer-description-notes')).textContent();
    const extracted_date_match = ad_date_brute.match(/Mis à jour:\s*(\d{2}\/\d{2}\/\d{4})/);
    const ad_date = new Date(extracted_date_match[1].toString().split('/').reverse().join('-'))

    if (!isSameDay(ad_date, current_date) && !isSameDay(ad_date, previousDay)) {
        log.info('AD OLDER THAN 1 DAY');
        return;
    }
    let ad = await page.evaluate(() => window['thor']['dataLayer']['av_items'][0]);
    const titleElement = await page.$('body > main > div > div.mainContent > div.offerDetailContainer > section > div.offerSummary.offerCreditPrice > h1 > p');
    const pictureUrlElement = (await page.$$('.swiper-slide > picture > img')).map(async (img) => await img.getAttribute('src') || await img.getAttribute('data-src'));
    const descriptionElement = await page.$('body > main > div > div.mainContent > div.offerDetailContainer > section > div.nativeAds > div.blocDescrProperty > article > p.descrProperty');
    const gas_certificateElement = await page.$("body > main > div > div.mainContent > div.offerDetailContainer > section > section.energyDiagnosticContainer > div > article.GES > ul > li > span[tabindex]");
    ad = {
        ...ad,
        title: titleElement ? await titleElement.textContent() : '',
        pictureUrl: pictureUrlElement ? await pictureUrlElement[0] : '',
        pictureUrls: pictureUrlElement ? await Promise.all(pictureUrlElement) : [],
        description: descriptionElement ? await descriptionElement.textContent() : '',
        gas_certificate: gas_certificateElement ? await gas_certificateElement.textContent() : '',
    };
});
const isSameDay = (date1: Date, date2: Date) => {
    return date1.getUTCFullYear() === date2.getUTCFullYear() &&
        date1.getUTCMonth() === date2.getUTCMonth() &&
        date1.getUTCDate() === date2.getUTCDate();
}
const logicImmo = new PlaywrightCrawler({
    ...logicimmoCrawlerOption,
    requestHandler: logicImmoRouter,
}, new Configuration({
    logLevel: LogLevel.INFO,
    purgeOnStart: true,
    persistStorage: false,
    storageClientOptions: {
        persistStorage: false,
        writeMetadata: false,
    },
    headless: true,
}));

const main = async () => {
    await logicImmo.run(['https://www.logic-immo.com/vente-immobilier-ile-de-france,1_0/options/groupprptypesids=1,2,6,7,12,3,18,4,5,14,13,11,10,9,8/searchoptions=0,1,3/page=1/order=update_date_desc']);
    await logicImmo.teardown();
    // await bieniciCrawler.run(['https://www.bienici.com/recherche/achat/france/maisonvilla,appartement,parking,terrain,loft,commerce,batiment,chateau,local,bureau,hotel,autres?mode=liste&tri=publication-desc']);
    // await bieniciCrawler.teardown();
}

main().then(() => console.log('DONE'));
