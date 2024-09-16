import { PlaywrightCrawlingContext } from "crawlee";
import { createCursor } from "ghost-cursor-playwright";
import { bypassDataDomeCaptchaByCapSolver } from "./captcha.bypass";


export const detectDataDomeCaptcha = async (context: PlaywrightCrawlingContext, startByCaptcha = false) => {
    const { page, session, log, waitForSelector } = context;
    const cursor = await createCursor(page);
    await cursor.actions.randomMove();
    log.info('Detecting if there is a CAPTCHA...');
    await page.waitForEvent('frameattached', { timeout: 5000 }).catch(() => { });
    return waitForSelector('iframe[src*="https://geo.captcha-delivery.com"]').then(async () => await handleCaptchaDetection(context)).catch(() => {
        if (!startByCaptcha) {
            log.info('No CAPTCHA detected.');
            return;
        };
        throw new Error('No CAPTCHA detected');
    });
}




const handleCaptchaDetection = async (context: PlaywrightCrawlingContext) => {
    const { page, session, log } = context;
    const cursor = await createCursor(page);
    const captchaElement = await page.$("iframe[src*='https://geo.captcha-delivery.com']");
    const captchaUrl = await captchaElement.getAttribute('src');
    const captchaFrame = await captchaElement.contentFrame();
    await cursor.actions.randomMove();
    log.info('CAPTCHA detected.');
    await cursor.actions.randomMove();
    log.info('Checking if session is flagged...');
    await captchaFrame.waitForSelector('#captcha-container > div.captcha__human > div > p');
    const isFlaggedElement = await captchaFrame.$('#captcha-container > div.captcha__human > div > p');
    const isFlaggedText = (await isFlaggedElement.textContent()).trim();
    if (isFlaggedText.match(/bloqué/i) || isFlaggedText.match(/blocked/i)) {
        session.retire();
        throw new Error('Session flagged. Switching to new session');
    }
    await cursor.actions.randomMove();
    await bypassDataDomeCaptchaByCapSolver(context, captchaUrl);
}