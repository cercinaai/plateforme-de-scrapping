import { Job } from "bull";
import { createPlaywrightRouter, Dictionary, PlaywrightCrawlingContext, RouterHandler } from "crawlee";
import { DataProcessingService } from "src/data-processing/data-processing.service";
import { logicImmoDefaultHandler } from "./handlers/logicimmo-default.handler";
import { logicImmoAdHandler } from "./handlers/logicimmo-ad.handler";


export const createLogicImmoRouter = async (job: Job, dataProcessingService: DataProcessingService): Promise<RouterHandler<PlaywrightCrawlingContext<Dictionary>>> => {
    const router = createPlaywrightRouter();
    router.addDefaultHandler(async (context) => await logicImmoDefaultHandler(context, job));
    router.addHandler('ad-single-url', async (context) => await logicImmoAdHandler(context, dataProcessingService, job));
    return router;
}