import { PlaywrightCrawlingContext, PlaywrightHook } from "crawlee";

export const interceptSelogerHttpResponse = async (context: PlaywrightCrawlingContext) => {
    const { page } = context;
    page.on('response', async (response) => {
        const url = response.url();
        if (url.includes('https://www.seloger.com/search-bff/api/externaldata')) {
            const body = await response.json();
            let ads = body['listingData']['cards'];
            ads = ads.filter((card: any) => card['type'] === 0);
            ads = ads.map((card: any) => card['listing'])
            await page.evaluate((transformed_ads) => {
                window['crawled_ads'] = transformed_ads;
            }, ads);
        }
    });
}

export const preSelogerHooksRegister: PlaywrightHook[] = []



