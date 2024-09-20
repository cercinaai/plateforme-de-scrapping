import { PlaywrightCrawlingContext, PlaywrightHook } from "crawlee";

const interceptSelogerHttpResponse = async (context: PlaywrightCrawlingContext) => {
    if (!context.page) return;
    context.adsHttpInterceptor = context.page.waitForResponse(async (response) => {
        const url = response.url();
        if (!url.includes('https://www.seloger.com/search-bff/api/externaldata')) return false;
        const body = await response.json();
        return body['listingData']['cards'] ? true : false;
    }, { timeout: 0 })
}

export const preSelogerHooksRegister: PlaywrightHook[] = [interceptSelogerHttpResponse]



