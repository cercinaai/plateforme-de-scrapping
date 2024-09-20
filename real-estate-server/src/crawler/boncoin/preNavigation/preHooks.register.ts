import { PlaywrightCrawlingContext, PlaywrightHook } from "crawlee";


const interceptBoncoinHttpResponse = async (context: PlaywrightCrawlingContext) => {
    if (!context.page) return;
    context.adsHttpInterceptor = context.page.waitForResponse(async (response) => {
        const url = response.url();
        if (!url.includes('https://api.leboncoin.fr/finder/search')) return false;
        const body = await response.json();
        return body['ads'] ? true : false;
    }, { timeout: 0 });
}


export const preBoncoinHooksRegister: PlaywrightHook[] = [interceptBoncoinHttpResponse] 