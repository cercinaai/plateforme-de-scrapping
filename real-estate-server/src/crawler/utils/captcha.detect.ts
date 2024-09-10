import { PlaywrightCrawlingContext } from "crawlee";
import { createCursor } from "ghost-cursor-playwright";


export const detectDataDomeCaptcha = async (context: PlaywrightCrawlingContext, { proxy_rotation }: { proxy_rotation: boolean }): Promise<string | boolean> => {
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