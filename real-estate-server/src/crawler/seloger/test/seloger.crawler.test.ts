import { Configuration, createPlaywrightRouter, log, LogLevel, PlaywrightCrawler, ProxyConfiguration } from "crawlee";
import { selogerCrawlerOptions } from "../../../config/playwright.config";
import { createCursor } from 'ghost-cursor-playwright';
import dotenv from 'dotenv';
import { scrollToTargetHumanWay } from "../../../crawler/utils/human-behavior.util";
import { detectDataDomeCaptcha } from "../../../crawler/utils/captcha.detect";
import { interceptSelogerHttpResponse } from "../preNavigation/preHooks.register";

dotenv.config({ path: 'real-estate.env' });

const proxyUrls = [
    "http://hephaestus.p.shifter.io:10065",
    "http://hephaestus.p.shifter.io:10066",
    "http://hephaestus.p.shifter.io:10067",
    "http://hephaestus.p.shifter.io:10068",
    "http://hephaestus.p.shifter.io:10069"
];
const france_locality = [
    { name: 'Île-de-France', link: ['2238'], limit: 986, data_grabbed: 0 },
    { name: 'Centre-Val de Loire', link: ['2234'], limit: 149, data_grabbed: 0 },
    { name: 'Bourgogne-Franche-Comté', link: ['2232'], limit: 156, data_grabbed: 0 },
    { name: 'Normandie', link: ['2236', '2231'], limit: 188, data_grabbed: 0 },
    { name: 'Hauts-de-France', link: ['2243', '2244'], limit: 264, data_grabbed: 0 },
    { name: 'Grand Est', link: ['2228', '2235', '2241'], limit: 293, data_grabbed: 0 },
    { name: 'Pays de la Loire', link: ['2247'], limit: 256, data_grabbed: 0 },
    { name: 'Bretagne', link: ['2233'], limit: 235, data_grabbed: 0 },
    { name: 'Nouvelle-Aquitaine', link: ['2229'], limit: 530, data_grabbed: 0 },
    { name: 'Occitanie', link: ['2239', '2242'], limit: 536, data_grabbed: 0 },
    { name: 'Auvergne-Rhône-Alpes', link: ['2251', '2230'], limit: 626, data_grabbed: 0 },
    { name: 'Corse', link: ['2248'], limit: 39, data_grabbed: 0 },
    // { name: 'Guadeloupe', link: ['900'], limit: 32, data_grabbed: 0 },
    // { name: 'Martinique', link: ['902'], limit: 23, data_grabbed: 0 },
    // { name: 'Guyane', link: ['903'], limit: 9, data_grabbed: 0 },
    // { name: 'La Reunion', link: ['906'], limit: 42, data_grabbed: 0 },
    // { name: 'Mayotte', link: ['903'], limit: 1, data_grabbed: 0 },
]
const REGION_REACHED = 0;

const router = createPlaywrightRouter();

router.addDefaultHandler(async (context) => {
    const { page, closeCookieModals, waitForSelector } = context;
    let PAGE_REACHED = 1;
    let TOTAL_DATA = 0;
    await page.waitForLoadState('load');
    await detectDataDomeCaptcha(context);
    await closeCookieModals();
    const cursor = await createCursor(page);
    while (TOTAL_DATA < france_locality[REGION_REACHED].limit) {
        log.info(`PAGE ${PAGE_REACHED}`);
        await cursor.actions.randomMove();
        await waitForSelector('a[data-testid="gsl.uilib.Paging.nextButton"]').catch(async () => {
            await page.goBack({ waitUntil: 'load' });
            await page.goForward({ waitUntil: 'load' });
            await waitForSelector('a[data-testid="gsl.uilib.Paging.nextButton"]');
            await closeCookieModals().catch(() => { });
        });
        let ads: any;
        if (PAGE_REACHED === 1) {
            ads = await page.evaluate(() => Array.from(window['initialData']['cards']['list']).filter(card => card['cardType'] === 'classified'));
        } else {
            ads = await page.evaluate(() => window['crawled_ads']);
        }
        TOTAL_DATA += ads.length;
        const nextButton = await page.$('a[data-testid="gsl.uilib.Paging.nextButton"]');
        const nextButtonPosition = await nextButton.boundingBox();
        await scrollToTargetHumanWay(context, nextButtonPosition.y);
        await page.mouse.move(nextButtonPosition.x - 10, nextButtonPosition.y - 10);
        await interceptSelogerHttpResponse(context);
        await nextButton.scrollIntoViewIfNeeded();
        await nextButton.click();
        await page.waitForTimeout(2000);
        PAGE_REACHED++;
    }
});

const selogerCrawler = new PlaywrightCrawler({
    ...selogerCrawlerOptions,
    proxyConfiguration: new ProxyConfiguration({ proxyUrls }),
    preNavigationHooks: [],
    requestHandler: router,
    errorHandler: (context, error) => { context.log.error(error.message) },

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

const build_link = (): string => {
    const { link } = france_locality[REGION_REACHED]
    const grouped_urls = link.map((l: string) => ({ divisions: [parseInt(l)] }))
    const string_urls = JSON.stringify(grouped_urls)
    return `https://www.seloger.com/list.htm?projects=2,5&types=2,4,1,13,9,3,14,12,11,10&natures=1,2,4&places=${string_urls}&sort=d_dt_crea&mandatorycommodities=0&privateseller=0&enterprise=0&houseboat=1&qsVersion=1.0&m=search_refine-redirection-search_results`
}

const test = async () => {
    await selogerCrawler.run([build_link()]);
    await selogerCrawler.requestQueue.drop();
    await selogerCrawler.teardown();
}

test().then(() => console.log('TEST FINISHED'))
