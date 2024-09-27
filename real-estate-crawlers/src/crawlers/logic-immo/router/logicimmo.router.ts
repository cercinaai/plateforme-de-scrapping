import { createPlaywrightRouter, Dictionary, PlaywrightCrawlingContext, RouterHandler } from "crawlee";
import { Job } from "bullmq";
import { logicImmoDefaultHandler } from "./handlers/logicimmo-default.handler";
import { logicImmoAdHandler } from "./handlers/logicimmo-ad.handler";



export const createLogicimmoRouter = async (job: Job): Promise<RouterHandler<PlaywrightCrawlingContext<Dictionary>>> => {
    const router = createPlaywrightRouter();
    router.addDefaultHandler(async (context) => await logicImmoDefaultHandler(job, context));
    router.addHandler('ad-single-url', async (context) => await logicImmoAdHandler(context))
    return router;
}

export const build_link = (job: Job): string => {
    const { link } = job.data.france_locality[job.data.REGION_REACHED]
    return `https://www.logic-immo.com/vente-immobilier-${link}/options/groupprptypesids=1,2,6,7,12,3,18,4,5,14,13,11,10,9,8/searchoptions=0,1/page=${job.data.PAGE_REACHED}/order=update_date_desc`;
}
