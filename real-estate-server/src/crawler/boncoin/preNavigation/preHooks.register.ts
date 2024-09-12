import { PlaywrightCrawlingContext, PlaywrightHook } from "crawlee";


const interceptBoncoinHttpResponse = async (context: PlaywrightCrawlingContext) => {
    const { page } = context;
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


export const preBoncoinHooksRegister: PlaywrightHook[] = [interceptBoncoinHttpResponse] 