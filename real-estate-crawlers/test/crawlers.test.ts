import { afterEach, beforeAll, describe, expect, test } from "vitest";
import { initProxy } from '../src/config/proxy.config';
import { Configuration, PlaywrightCrawler, ProxyConfiguration } from "crawlee";
import { bieniciCrawlerOption, boncoinCrawlerOption, logicimmoCrawlerOption, selogerCrawlerOptions } from '../src/config/playwright.config';
import { crawl } from './../src/utils/crawl.utils';
import { detectDataDomeCaptcha } from "../src/utils/captcha.detect";
import { createCursor } from "ghost-cursor-playwright";
import { ElementHandle } from "playwright";
import { scrollToTargetHumanWay } from "../src/utils/human-behavior.util";
import { initMongoDB } from "../src/config/mongodb.config";
import { generateDefaultCrawlersConfig } from "../src/config/crawlers.config";
import { config } from "dotenv";




describe('Crawlers Suite Tests', () => {
    let crawler!: PlaywrightCrawler;
    beforeAll(async () => {
        config({ path: `./environments/${process.env.NODE_ENV}.env` });
        await initMongoDB();
        await generateDefaultCrawlersConfig();
    });

    afterEach(async () => {
        await crawler.requestQueue?.drop();
        await crawler.teardown();
    });

    test.sequential('boncoin-crawler', { timeout: 120000 }, async () => {
        let proxyUrls: string[] = await initProxy();
        crawler = createBoncoinTestCrawler(proxyUrls);
        const url = 'https://www.leboncoin.fr/recherche?category=9&locations=r_12&real_estate_type=1,2,3,4,5&immo_sell_type=old,new,viager&owner_type=pro';
        const stats = await crawl(crawler, [url], 120000);
        expect(stats).not.toBeNull();
    });
    // test.sequential('seloger-crawler', async () => { });

    // test.sequential('bienici-crawler', async () => { });

    // test.sequential('logic-immo-crawler', async () => { });

});


const createBoncoinTestCrawler = (proxyUrls: string[]) => {
    return new PlaywrightCrawler({
        ...boncoinCrawlerOption,
        proxyConfiguration: new ProxyConfiguration({ proxyUrls }),
        requestHandler: async (context) => {
            let { page, waitForSelector, closeCookieModals } = context;
            await page.waitForLoadState('load');
            await detectDataDomeCaptcha(context, true);
            await closeCookieModals();
            const cursor = await createCursor(page as any);
            await waitForSelector("a[title='Page suivante']", 10000);
            await cursor.actions.randomMove();
            const nextButton = await page.$("a[title='Page suivante']") as ElementHandle<SVGElement | HTMLElement>;
            const nextButtonPosition = await nextButton.boundingBox() as { x: number, y: number };
            await scrollToTargetHumanWay(context, nextButtonPosition?.y);
            await page.mouse.move(nextButtonPosition.x - 10, nextButtonPosition.y - 10);
            await page.click("a[title='Page suivante']");
        }
    }, new Configuration({
        headless: false,
        purgeOnStart: true,
        persistStorage: false,
        storageClientOptions: {
            persistStorage: false,
            writeMetadata: false,
        },
    }))
}

const createSelogerTestCrawler = (proxyUrls: string[]) => {
    return new PlaywrightCrawler({
        ...selogerCrawlerOptions,
        proxyConfiguration: new ProxyConfiguration({ proxyUrls }),
        requestHandler: (context) => { }

    }, new Configuration({
        headless: false,
        purgeOnStart: true,
        persistStorage: false,
        storageClientOptions: {
            persistStorage: false,
            writeMetadata: false,
        },
    }))
}


const createBieniciTestCrawler = () => {
    return new PlaywrightCrawler({
        ...bieniciCrawlerOption,
        requestHandler: (context) => { }

    }, new Configuration({
        headless: false,
        purgeOnStart: true,
        persistStorage: false,
        storageClientOptions: {
            persistStorage: false,
            writeMetadata: false,
        },
    }))
}


const createLogicImmoTestCrawler = (proxyUrls: string[]) => {
    return new PlaywrightCrawler({
        ...logicimmoCrawlerOption,
        proxyConfiguration: new ProxyConfiguration({ proxyUrls }),
        requestHandler: (context) => { }

    }, new Configuration({
        headless: false,
        purgeOnStart: true,
        persistStorage: false,
        storageClientOptions: {
            persistStorage: false,
            writeMetadata: false,
        },
    }))
}