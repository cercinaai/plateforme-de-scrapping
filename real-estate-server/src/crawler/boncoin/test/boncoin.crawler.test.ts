import { Configuration, createPlaywrightRouter, log, LogLevel, PlaywrightCrawler, ProxyConfiguration } from "crawlee";
import { boncoinCrawlerOption } from "../../../config/playwright.config";
import { createCursor } from 'ghost-cursor-playwright';
import dotenv from 'dotenv';
import { isSameDayOrBefore } from "../../../crawler/utils/date.util";
import { scrollToTargetHumanWay } from "../../../crawler/utils/human-behavior.util";
import { detectDataDomeCaptcha } from "../../../crawler/utils/captcha.detect";
import { save_files } from "../../../data-processing/test/save-file.test";

dotenv.config({ path: 'real-estate.env' });

const proxyUrls = [
    "http://hephaestus.p.shifter.io:10065",
    "http://hephaestus.p.shifter.io:10066",
    "http://hephaestus.p.shifter.io:10067",
    "http://hephaestus.p.shifter.io:10068",
    "http://hephaestus.p.shifter.io:10069"
];

const france_locality = [
    { name: 'Île-de-France', link: 'r_12', limit: 986, data_grabbed: 0 },
    { name: 'Centre-Val de Loire', link: 'r_37', limit: 149, data_grabbed: 0 },
    { name: 'Bourgogne-Franche-Comté', link: 'r_31', limit: 156, data_grabbed: 0 },
    { name: 'Normandie', link: 'r_34', limit: 188, data_grabbed: 0 },
    { name: 'Hauts-de-France', link: 'r_32', limit: 264, data_grabbed: 0 },
    { name: 'Grand Est', link: 'r_33', limit: 293, data_grabbed: 0 },
    { name: 'Pays de la Loire', link: 'r_18', limit: 256, data_grabbed: 0 },
    { name: 'Bretagne', link: 'r_6', limit: 235, data_grabbed: 0 },
    { name: 'Nouvelle-Aquitaine', link: 'r_35', limit: 530, data_grabbed: 0 },
    { name: 'Occitanie', link: 'r_36', limit: 536, data_grabbed: 0 },
    { name: 'Auvergne-Rhône-Alpes', link: 'r_30', limit: 626, data_grabbed: 0 },
    { name: 'Corse', link: 'r_9', limit: 39, data_grabbed: 0 },
    { name: 'Guadeloupe', link: 'r_23', limit: 32, data_grabbed: 0 },
    { name: 'Martinique', link: 'r_24', limit: 23, data_grabbed: 0 },
    { name: 'Guyane', link: 'r_25', limit: 9, data_grabbed: 0 },
    // { name: 'La Reunion', link: r_, limit: 42, data_grabbed: 0 },
    // { name: 'Mayotte', link: ['903'], limit: 1, data_grabbed: 0 },
]

let REGION_REACHED = 0;
let PAGE_REACHED = 1;
const router = createPlaywrightRouter();

router.addDefaultHandler(async (context) => {
    const { page, closeCookieModals, waitForSelector, enqueueLinks } = context;
    await page.waitForLoadState('domcontentloaded');
    await detectDataDomeCaptcha(context, true);
    await closeCookieModals();
    await waitForSelector("a[title='Page suivante']");
    const cursor = await createCursor(page);
    let { limit, data_grabbed } = france_locality[REGION_REACHED];
    // PAGE LOOP
    while (data_grabbed < limit) {
        await cursor.actions.randomMove();
        let ads: any;
        if (PAGE_REACHED === 1) {
            let data = await page.$("script[id='__NEXT_DATA__']");
            ads = JSON.parse(await data?.textContent() as string)["props"]["pageProps"]["searchData"]["ads"];
        } else {
            ads = await page.evaluate(() => window['crawled_ads']);
        }
        // let date_filter_content = Array.from(ads).filter((ad) => isSameDayOrBefore({ target_date: new Date(ad["index_date"]), check_date, returnDays: 1 }));
        if (ads.length === 0) {
            log.info("Found ads older than check_date. Passing Into Next Region.");
            break;
        }
        if (ads.length > ads.length) {
            data_grabbed += ads.length;
            log.info("Found ads older than check_date. Passing Into Next Region.");
            break;
        }
        data_grabbed += ads.length;
        const nextButton = await page.$("a[title='Page suivante']");
        const nextButtonPosition = await nextButton.boundingBox();
        await scrollToTargetHumanWay(context, nextButtonPosition.y);
        await page.click("a[title='Page suivante']");
        await page.waitForTimeout(2000);
        log.info(`Scraped ${data_grabbed} ads from ${france_locality[REGION_REACHED].name}.`);
        PAGE_REACHED++;
    }
    if (REGION_REACHED >= france_locality.length - 1) return;
    // REGION LOOP
    REGION_REACHED++;
    await enqueueLinks({ urls: [build_url()] });
})
const build_url = (): string => {
    const { link } = france_locality[REGION_REACHED];
    return `https://www.leboncoin.fr/recherche?category=9&locations=${link}&real_estate_type=1,2,3,4,5&immo_sell_type=old,new,viager&owner_type=pro`
}

const boncoinCrawler = new PlaywrightCrawler({
    ...boncoinCrawlerOption,
    preNavigationHooks: [
        async ({ page }) => {
            page.on('response', async (response) => {
                const url = response.url();
                if (url.includes('https://api.leboncoin.fr/finder/search')) {
                    const body = await response.json();
                    let ads = body['ads'];
                    if (!ads) return;
                    await page.evaluate((transformed_ads) => {
                        window['crawled_ads'] = transformed_ads;
                    }, ads);
                }
            })
        }
    ],
    proxyConfiguration: new ProxyConfiguration({ proxyUrls }),
    requestHandler: router,
    errorHandler: (context, error) => {
        const { session } = context;
        session.markBad();
        context.log.error(error.message)
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
}))

const test = async () => {
    await boncoinCrawler.run([build_url()]);
    await boncoinCrawler.requestQueue.drop();
    await boncoinCrawler.teardown();
}

test().then(() => console.log('TEST FINISHED'))