import { PlaywrightCrawlingContext, PlaywrightHook } from "crawlee";


export const interceptBoncoinHttpResponse = async (context: PlaywrightCrawlingContext) => {
    const { page } = context;
    page.on('response', async (response) => {
        const url = response.url();
        if (!url.includes('https://api.leboncoin.fr/finder/search')) return;
        const body = await response.json();
        if (!body['ads']) return;
        await page.evaluate((body) => { window['crawled_ads'] = body['ads']; }, body);
    })
}


export const preBoncoinHooksRegister: PlaywrightHook[] = [] 