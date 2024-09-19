import { PlaywrightCrawlingContext, PlaywrightHook } from "crawlee";



const interceptBieniciHttpResponse = async (context: PlaywrightCrawlingContext) => {
    try {
        const { page, log } = context;
        page.on('response', async (response) => {
            try {
                const url = response.url();
                if (url.match(/realEstateAd\.json\?id=.*$/)) {
                    // SINGLE AD PAGE
                    let body = await response.json();
                    if (body) {
                        const url = page.url();
                        await page.evaluate((ad) => {
                            window['single_ad'] = ad;
                        }, { url, ...body });
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
            } catch (error) {
                console.error(error);
                return;
            }
        })
    } catch (error) {
        console.error(error);
        return;
    }
}


export const preBieniciHooksRegister: PlaywrightHook[] = [interceptBieniciHttpResponse]