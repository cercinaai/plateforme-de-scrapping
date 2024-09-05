import { Configuration, Cookie, createPlaywrightRouter, LogLevel, PlaywrightCrawler, PlaywrightCrawlingContext, ProxyConfiguration, Session } from "crawlee";
import { selogerCrawlerOptions } from "../../config/playwright.config";
import { createCursor } from 'ghost-cursor-playwright';
import { Page } from "playwright";
import axios from 'axios';


const proxyUrls = [
    "http://hephaestus.p.shifter.io:11740",
    "http://hephaestus.p.shifter.io:11741",
    "http://hephaestus.p.shifter.io:11742",
    "http://hephaestus.p.shifter.io:11743",
    "http://hephaestus.p.shifter.io:11744"
];

const router = createPlaywrightRouter();

router.addDefaultHandler(async (context) => {
    const { page, closeCookieModals, waitForSelector } = context;
    const isCaptcha = await detect_captcha(context);
    console.log(isCaptcha);
    if (isCaptcha) return;
    await page.waitForTimeout(80000);
    // await closeCookieModals();
    // const cursor = await createCursor(page);
    // await cursor.actions.randomMove();
    // const nextButton = await page.$('a[data-testid="gsl.uilib.Paging.nextButton"]');
    // await nextButton.scrollIntoViewIfNeeded();
    // await page.waitForTimeout(1000);
    // const nextButtonPosition = await nextButton.boundingBox();
    // await page.mouse.move(nextButtonPosition.x, nextButtonPosition.y);
    // await page.waitForTimeout(1000);
    // await nextButton.click();
    // await cursor.actions.randomMove();
    // await page.waitForURL('https://www.seloger.com/**', { waitUntil: 'domcontentloaded' });
    // await cursor.actions.randomMove();
    // await page.waitForTimeout(8000);
    // const saleButton = await page.$("li.c-main-list:nth-child(1) > div:nth-child(1) > a:nth-child(1)");
    // const saleButtonPosition = await saleButton.boundingBox();
    // await page.mouse.move(saleButtonPosition.x, saleButtonPosition.y);
    // await page.waitForTimeout(Math.random() * 2000 + 1000);
    // const saleButton2 = await page.$("li.c-main-list:nth-child(1) > section:nth-child(4) > div:nth-child(1) > div:nth-child(3) > ul:nth-child(1) > li:nth-child(1) > a:nth-child(1)");
    // const saleButton2Position = await saleButton2.boundingBox();
    // await page.mouse.move(saleButton2Position.x, saleButton2Position.y);
    // await page.waitForTimeout(Math.random() * 2000 + 1000);
    // await saleButton2.click();
    // await page.waitForURL('https://www.seloger.com/vente.htm', { waitUntil: 'domcontentloaded' });
    // await cursor.actions.randomMove();
    // const searchButton = await page.$("button[data-testid='gsl.agatha.apply_btn']");
    // await searchButton.scrollIntoViewIfNeeded();
    // const searchButtonPosition = await searchButton.boundingBox();
    // await cursor.actions.move({ x: searchButtonPosition.x, y: searchButtonPosition.y });
    // await page.waitForTimeout(Math.random() * 2000 + 1000);
    // await searchButton.click();
    // await page.waitForURL('https://www.seloger.com/**', { waitUntil: 'domcontentloaded' });
    // await page.waitForTimeout(8000);

});

const handleCapSolver = async (context: PlaywrightCrawlingContext): Promise<void> => {
    const { page, request, proxyInfo, log, browserController } = context;
    // await page.waitForLoadState('domcontentloaded');
    const captchaUrl = await detect_captcha(context);
    if (typeof captchaUrl === 'boolean' && captchaUrl === false) return;
    if (typeof captchaUrl === 'boolean' && captchaUrl === true) throw new Error('Session flagged. Switching to new session');
    log.info('Attempting to solve dataDome CAPTCHA using CapSolver.');
    const fingerprint = browserController.launchContext.fingerprint.fingerprint;
    const playload = {
        clientKey: 'CAP-B3C6167F83FE22BEC2B7260FC64B03D9',
        task: {
            type: 'DatadomeSliderTask',
            websiteURL: request.url,
            captchaUrl: captchaUrl,
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
            const getResultPayload = { clientKey: 'CAP-B3C6167F83FE22BEC2B7260FC64B03D9', taskId: task_id };
            const taskRes = await axios.post("https://api.capsolver.com/getTaskResult", getResultPayload, { headers: { "Content-Type": "application/json" } });
            const status = taskRes.data.status;
            if (status === "ready") {
                log.info('Solved dataDome CAPTCHA using CapSolver');
                const cookie = parseCookieString(taskRes.data.solution.cookie);
                await page.context().addCookies([cookie]);
                await page.reload({ waitUntil: 'domcontentloaded' });
                return;
            }
            if (status === "failed" || taskRes.data.errorId) throw new Error(taskRes.data.errorMessage);
        }
    } catch (error) {
        log.error(error);
    }

}

const detect_captcha = async (context: PlaywrightCrawlingContext): Promise<string | boolean> => {
    const { page, session, log, waitForSelector } = context;
    log.info('Detecting CAPTCHA...');
    return waitForSelector('body > iframe[src*="https://geo.captcha-delivery.com"]').then(async () => {
        const captchaElement = await page.$("body > iframe[src*='https://geo.captcha-delivery.com']");
        const captchaUrl = await captchaElement.getAttribute('src');
        const captchaFrame = await captchaElement.contentFrame();
        if (!captchaFrame) throw new Error('Failed to get captcha frame');
        log.info('CAPTCHA detected. Captcha URL: ' + captchaUrl);
        log.info('Checking if session is flagged...');
        const isFlagged = await captchaFrame.$('#captcha-container > div.captcha__human > div > p');
        if (!isFlagged) return captchaUrl;
        const textContent = await isFlagged.textContent();
        if (textContent && textContent.match(/blocked/i)) {
            log.info('Session flagged. Switching to new session');
            session.retire();
            return true;
        }

    }).catch(async () => {
        log.info('No CAPTCHA detected');
        return false;
    })
    // await waitForSelector('body > iframe[src*="https://geo.captcha-delivery.com/captcha"]').then(async () => {
    //     const captchaElement = await page.$("body > iframe[src*='https://geo.captcha-delivery.com/captcha']");
    //     const captchaUrl = await captchaElement.getAttribute('src');
    //     const captchaFrame = await captchaElement.contentFrame();
    //     if (!captchaFrame) throw new Error('Failed to get captcha frame');
    //     await waitForSelector('#captcha-container > div.captcha__human > div > p').then(async () => {
    //         const isFlagged = await captchaFrame.$('#captcha-container > div.captcha__human > div > p');
    //         if (isFlagged) {
    //             const textContent = await isFlagged.textContent();
    //             if (textContent && textContent.match(/blocked/i)) {
    //                 log.info('Session flagged. Switching to new session');
    //                 session.retire();
    //                 throw new Error('Session flagged. Switching to new session');
    //             }
    //         }
    //     }).catch(async () => {
    //         return captchaUrl;
    //     })
    // }).catch(async () => {
    //     log.info('No CAPTCHA detected');
    // });
    // return false;
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

const selogerCrawler = new PlaywrightCrawler({
    ...selogerCrawlerOptions,
    proxyConfiguration: new ProxyConfiguration({ proxyUrls }),
    // postNavigationHooks: [async (context) => await handleCapSolver(context)],
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


const test = async () => {
    await selogerCrawler.run(['https://www.seloger.com/list.htm?projects=2,5&types=2,4,1,13,9,3,14,12,11,10&natures=1,2,4&sort=d_dt_crea&mandatorycommodities=0&privateseller=0&enterprise=0&houseboat=1&qsVersion=1.0&m=search_refine-redirection-search_results']);
    await selogerCrawler.requestQueue.drop();
    await selogerCrawler.teardown();
}

test().then(() => console.log('TEST FINISHED'))
