import { Configuration, Cookie, createPlaywrightRouter, log, LogLevel, PlaywrightCrawler, PlaywrightCrawlingContext, ProxyConfiguration, Session } from "crawlee";
import { selogerCrawlerOptions } from "../../config/playwright.config";
import { createCursor } from 'ghost-cursor-playwright';
import { Page } from "playwright";
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config({ path: 'real-estate.env' });

const proxyUrls = [
    "http://hephaestus.p.shifter.io:10065",
    "http://hephaestus.p.shifter.io:10066",
    "http://hephaestus.p.shifter.io:10067",
    "http://hephaestus.p.shifter.io:10068",
    "http://hephaestus.p.shifter.io:10069"
];

const router = createPlaywrightRouter();

router.addDefaultHandler(async (context) => {
    const { page, closeCookieModals, waitForSelector, pushData } = context;
    let PAGE = 1;
    let TOTAL_DATA = 0;
    await handleCapSolver(context);
    await closeCookieModals().catch(() => { });
    const cursor = await createCursor(page);
    await cursor.actions.randomMove();
    await waitForSelector('a[data-testid="gsl.uilib.Paging.nextButton"]').catch(async () => {
        await page.goBack({ waitUntil: 'load' });
        await page.goForward({ waitUntil: 'load' });
        await waitForSelector('a[data-testid="gsl.uilib.Paging.nextButton"]');
    });
    const nextButton = await page.$('a[data-testid="gsl.uilib.Paging.nextButton"]');
    const nextButtonPosition = await nextButton.boundingBox();
    let ads = await page.evaluate(() => Array.from(window['initialData']['cards']['list']).filter(card => card['cardType'] === 'classified'));
    TOTAL_DATA += ads.length;
    await scrollToTargetHumanWay(page, nextButtonPosition.y);
    await page.mouse.move(nextButtonPosition.x - 10, nextButtonPosition.y - 10);
    await nextButton.scrollIntoViewIfNeeded();
    await nextButton.click();
    await page.waitForTimeout(2000);
    while (PAGE < 3) {
        log.info(`PAGE ${PAGE}`);
        await closeCookieModals().catch(() => { });
        const cursor = await createCursor(page);
        await cursor.actions.randomMove();
        await waitForSelector('a[data-testid="gsl.uilib.Paging.nextButton"]').catch(async () => {
            await page.goBack({ waitUntil: 'load' });
            await page.goForward({ waitUntil: 'load' });
            await waitForSelector('a[data-testid="gsl.uilib.Paging.nextButton"]');
        });
        const nextButton = await page.$('a[data-testid="gsl.uilib.Paging.nextButton"]');
        const nextButtonPosition = await nextButton.boundingBox();
        ads = await page.evaluate(() => window['crawled_ads']);
        TOTAL_DATA += ads.length;
        await pushData(ads);
        await scrollToTargetHumanWay(page, nextButtonPosition.y);
        await page.mouse.move(nextButtonPosition.x - 10, nextButtonPosition.y - 10);
        await nextButton.scrollIntoViewIfNeeded();
        await nextButton.click();
        await page.waitForTimeout(2000);
        PAGE++;
    }
    console.log(TOTAL_DATA);
    console.log(PAGE);
});


const handleCapSolver = async (context: PlaywrightCrawlingContext, firstTime = true): Promise<void> => {
    const { page, request, proxyInfo, log, browserController } = context;
    if (firstTime) await page.waitForLoadState('networkidle');
    const captcha_detection = await detect_captcha(context, { proxy_rotation: true });
    if (typeof captcha_detection === 'boolean' && captcha_detection === false) return;
    if (typeof captcha_detection === 'boolean' && captcha_detection === true) throw new Error('Session flagged. Switching to new session');
    log.info('Attempting to solve dataDome CAPTCHA using CapSolver.');
    const fingerprint = browserController.launchContext.fingerprint.fingerprint;
    const playload = {
        clientKey: process.env.CAPSOLVER_API_KEY,
        task: {
            type: 'DatadomeSliderTask',
            websiteURL: request.url,
            captchaUrl: captcha_detection,
            proxy: `${proxyInfo.hostname}:${proxyInfo.port}`,
            userAgent: fingerprint.navigator.userAgent
        }
    }
    try {
        const createTaskRes = await axios.post('https://api.capsolver.com/createTask', playload, { headers: { "Content-Type": "application/json" } });
        const task_id = createTaskRes.data.taskId;
        if (!task_id) throw new Error('Failed to create CapSolver task');
        while (true) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const getResultPayload = { clientKey: process.env.CAPSOLVER_API_KEY, taskId: task_id };
            const taskRes = await axios.post("https://api.capsolver.com/getTaskResult", getResultPayload, { headers: { "Content-Type": "application/json" } });
            const status = taskRes.data.status;
            if (status === "ready") {
                log.info('Solved dataDome CAPTCHA using CapSolver');
                const cookie = parseCookieString(taskRes.data.solution.cookie);
                await page.context().addCookies([cookie]);
                await page.reload({ waitUntil: 'networkidle' });
                return;
            }
            if (status === "failed" || taskRes.data.errorId) {
                console.log(taskRes.data);
                throw new Error(taskRes.data.errorMessage)
            };
        }
    } catch (error) {
        console.log(error);
    }

}

const detect_captcha = async (context: PlaywrightCrawlingContext, { proxy_rotation }: { proxy_rotation: boolean }): Promise<string | boolean> => {
    const { page, session, log, waitForSelector } = context;
    log.info('Detecting CAPTCHA...');
    const cursor = await createCursor(page);
    await cursor.actions.randomMove();
    return waitForSelector('body > iframe[src*="https://geo.captcha-delivery.com"]').then(async () => {
        const captchaElement = await page.$("body > iframe[src*='https://geo.captcha-delivery.com']");
        const captchaUrl = await captchaElement.getAttribute('src');
        const captchaFrame = await captchaElement.contentFrame();
        await cursor.actions.randomMove();
        log.info('CAPTCHA detected.');
        if (!proxy_rotation) return true;
        await cursor.actions.randomMove();
        log.info('Checking if session is flagged...');
        await captchaFrame.waitForSelector('#captcha-container > div.captcha__human > div > p');
        const isFlaggedElement = await captchaFrame.$('#captcha-container > div.captcha__human > div > p');
        const isFlaggedText = (await isFlaggedElement.textContent()).trim();
        if (isFlaggedText.match(/bloqué/i) || isFlaggedText.match(/blocked/i)) {
            session.markBad();
            return true;
        }
        await cursor.actions.randomMove();
        return captchaUrl;
    }).catch(async () => {
        log.info('No CAPTCHA detected');
        return false;
    });
}

const parseCookieString = (cookieString: string): Cookie => {
    const cookieArray = cookieString.split(';').map(part => part.trim());
    const [nameValue, ...attributes] = cookieArray;
    const [name, value] = nameValue.split('=');

    const cookie: Cookie = { name, value };

    attributes.forEach(attribute => {
        const [key, val] = attribute.split('=');
        switch (key.toLowerCase()) {
            case 'domain':
                cookie.domain = val;
                break;
            case 'path':
                cookie.path = val;
                break;
            case 'secure':
                cookie.secure = true;
                break;
            case 'httponly':
                cookie.httpOnly = true;
                break;
            case 'samesite':
                cookie.sameSite = val as 'Strict' | 'Lax' | 'None';
                break;
            case 'max-age':
                cookie.expires = Math.floor(Date.now() / 1000) + parseInt(val);
                break;
        }
    });

    return cookie;
}

const scrollToTargetHumanWay = async (page: Page, target: number) => {
    if (!target) {
        target = await page.evaluate(() => window.innerHeight);
    };
    let currentScrollY = await page.evaluate(() => window.scrollY);
    const cursor = await createCursor(page);

    while (currentScrollY < target) {
        // Random small scroll step to mimic human behavior
        const scrollStep = Math.floor(Math.random() * 100) + 50;

        // Scroll by a small amount and update the cursor
        await cursor.actions.randomMove();
        await page.evaluate((step) => {
            window.scrollTo({ behavior: 'smooth', top: window.scrollY + step }); // Scroll down by the step amount
        }, scrollStep);

        // Wait for a short period to simulate human scroll pauses
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 200 + 200)); // 200 to 400ms pause

        // Update the current scroll position
        currentScrollY = await page.evaluate(() => window.scrollY);

        // Stop scrolling if we exceed the target
        if (currentScrollY >= target) {
            break;
        }
    }
}

const selogerCrawler = new PlaywrightCrawler({
    ...selogerCrawlerOptions,
    requestHandlerTimeoutSecs: 1800,
    proxyConfiguration: new ProxyConfiguration({ proxyUrls }),
    preNavigationHooks: [
        async ({ page, log }) => {
            page.on('response', async (response) => {
                const url = response.url();
                if (url.includes('https://www.seloger.com/search-bff/api/externaldata')) {
                    log.info('DETECTED RESPONSE');
                    const body = await response.json();
                    let ads = body['listingData']['cards'];
                    await page.evaluate((ads) => {
                        window['crawled_ads'] = ads.filter((card: any) => card['type'] === 0);
                    }, ads);
                }
            });
        }
    ],
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
    headless: true,
}));


const test = async () => {
    await selogerCrawler.run(['https://www.seloger.com/list.htm?projects=2,5&types=2,4,1,13,9,3,14,12,11,10&natures=1,2,4&sort=d_dt_crea&mandatorycommodities=0&privateseller=0&enterprise=0&houseboat=1&qsVersion=1.0&m=search_refine-redirection-search_results']);
    await selogerCrawler.requestQueue.drop();
    await selogerCrawler.teardown();
}

test().then(() => console.log('TEST FINISHED'))
