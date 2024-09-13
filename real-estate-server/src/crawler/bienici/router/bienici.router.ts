import { Job } from "bull";
import { createPlaywrightRouter, Dictionary, PlaywrightCrawlingContext, RouterHandler } from "crawlee";
import { DataProcessingService } from "src/data-processing/data-processing.service";
import { bieniciDefaultHandler } from "./handlers/bienici-default.handler";
import { bieniciAdHandler } from "./handlers/bienici-ad.handler";


export const createBienIciRouter = async (job: Job, dataProcessingService: DataProcessingService): Promise<RouterHandler<PlaywrightCrawlingContext<Dictionary>>> => {
    const router = createPlaywrightRouter();
    router.addDefaultHandler(async (context) => await bieniciDefaultHandler(context, job));
    router.addHandler('ad-single-url', async (context) => await bieniciAdHandler(context, dataProcessingService, job));
    return router;
}