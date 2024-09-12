import { PlaywrightCrawlingContext, PlaywrightHook } from "crawlee";



const interceptBieniciHttpResponse = async (context: PlaywrightCrawlingContext) => {
    const { page } = context;
    page.on('response', async (response) => {
        const url = response.url();
        if (url.match(/realEstateAd\.json\?id=.*$/)) {
            // SINGLE AD PAGE
            let body = await response.json();
            if (body) {
                await page.evaluate((body) => window['single_ad'] = { ...body, url: page.url() }, body);
            }
        }
        if (url.match(/realEstateAds\.json\?filters=.*$/)) {
            // LIST PAGE
            let body = await response.json();
            if (body) {
                let ads = body.realEstateAds || [];
                await page.evaluate((ads) => { window['crawled_ads'] = ads; }, ads);
            }
        }
    })
}


export const preBieniciHooksRegister: PlaywrightHook[] = [interceptBieniciHttpResponse]