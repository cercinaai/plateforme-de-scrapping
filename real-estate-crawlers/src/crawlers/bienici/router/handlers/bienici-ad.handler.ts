import { PlaywrightCrawlingContext } from "crawlee";
import { initLogger } from "../../../../config/logger.config";
import { CRAWLER_ORIGIN } from "../../../../utils/enum";
import { ingestData } from "../../../../data-ingestion/data.ingestion";

const logger = initLogger(CRAWLER_ORIGIN.BIENICI);


export const bieniciAdHandler = async (context: PlaywrightCrawlingContext) => {
    const { single_ad_response, request } = context;
    const res = await single_ad_response as Response;
    if (!res) return;
    const single_ad = await res.json();
    if (!single_ad) {
        logger.info('Ad Not Found Exit...')
        return;
    };
    await ingestData({ url: request.url, ...single_ad }, CRAWLER_ORIGIN.BIENICI);
}