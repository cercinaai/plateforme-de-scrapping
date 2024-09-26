import type { PlaywrightCrawlingContext } from "crawlee";
import { createCursor } from "ghost-cursor-playwright";
import { bypassDataDomeCaptchaByCapSolver, bypassDataDomeCaptchaBy2Captcha } from "./captcha.bypass";
import type { ElementHandle, Frame } from "playwright";


export const detectDataDomeCaptcha = async (context: PlaywrightCrawlingContext, startByCaptcha = false) => {
    const { page, log, waitForSelector } = context;
    const cursor = await createCursor(page as any);
    await cursor.actions.randomMove();
    log.info('Detecting if there is a CAPTCHA...');
    await page.waitForEvent('frameattached', { timeout: 5000 }).catch(() => { });
    return waitForSelector('iframe[src*="https://geo.captcha-delivery.com"]')
        .then(async () => await handleCaptchaDetection(context))
        .catch((err) => {
            if (!err.message.includes('Timeout 5000ms exceeded')) {
                throw err;
            }
            if (!startByCaptcha) {
                log.info('No CAPTCHA detected.');
                return;
            };
            throw new Error('No CAPTCHA detected');
        });
}




const handleCaptchaDetection = async (context: PlaywrightCrawlingContext) => {
    const { page, session, log } = context;
    const cursor = await createCursor(page as any);
    const captchaElement = await page.$("iframe[src*='https://geo.captcha-delivery.com']") as ElementHandle<SVGElement | HTMLElement>;
    const captchaUrl = await captchaElement?.getAttribute('src') as string;
    const captchaFrame = await captchaElement.contentFrame() as Frame;
    await cursor.actions.randomMove();
    log.info('CAPTCHA detected.');
    await cursor.actions.randomMove();
    log.info('Checking if session is flagged...');
    const isFlaggedElement = await captchaFrame.waitForSelector('#captcha-container > div.captcha__human > div > p') as ElementHandle<SVGElement | HTMLElement>;
    const isFlaggedText = await isFlaggedElement.textContent() as string;
    if (isFlaggedText.trim().match(/bloqué/i) || isFlaggedText.trim().match(/blocked/i)) {
        session?.retire();
        throw new Error('Session flagged. Switching to new session');
    }
    await cursor.actions.randomMove();
    await bypassDataDomeCaptchaByCapSolver(context, captchaUrl);
}