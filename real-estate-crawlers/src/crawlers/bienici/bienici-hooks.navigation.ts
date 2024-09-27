import { PlaywrightCrawlingContext, PlaywrightHook } from "crawlee";



const interceptBieniciHttpResponse = async (context: PlaywrightCrawlingContext) => {
    const { page } = context;
    const ads_list_response = page.waitForResponse(async (response) => {
        const url = response.url();
        if (!url.match(/realEstateAds\.json\?filters=.*$/)) return false;
        const body = await response.json();
        if (!body || !body['realEstateAds']) return false;
        return true;
    }).catch(() => { });
    const single_ad_response = page.waitForResponse(async (response) => {
        const url = response.url();
        if (!url.match(/realEstateAd\.json\?id=.*$/)) return false;
        const body = await response.json();
        if (!body) return false;
        return true;
    }).catch(() => { });
    context.ads_list_response = ads_list_response;
    context.single_ad_response = single_ad_response;
}


export const bieniciPreNavigationHooks: PlaywrightHook[] = [interceptBieniciHttpResponse]