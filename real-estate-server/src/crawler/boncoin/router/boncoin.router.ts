import { Job } from "bull";
import { createPlaywrightRouter, Dictionary, PlaywrightCrawlingContext, RouterHandler } from "crawlee";
import { DataProcessingService } from "src/data-processing/data-processing.service";
import { boncoinDefaultHandler } from "./handlers/boncoin-default.handler";


export const createBoncoinRouter = async (job: Job, dataProcessingService: DataProcessingService): Promise<RouterHandler<PlaywrightCrawlingContext<Dictionary>>> => {
    const router = createPlaywrightRouter();
    router.addDefaultHandler(async (context) => await boncoinDefaultHandler(context, dataProcessingService, job));
    return router;
}