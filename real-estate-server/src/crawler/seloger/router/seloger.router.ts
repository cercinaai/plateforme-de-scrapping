import { Job } from "bull";
import { createPlaywrightRouter, Dictionary, PlaywrightCrawlingContext, RouterHandler } from "crawlee";
import { DataProcessingService } from "src/data-processing/data-processing.service";
import { selogerDefaultHandler } from "./handlers/seloger-default.handler";


export const createSelogerRouter = async (job: Job, dataProcessingService: DataProcessingService): Promise<RouterHandler<PlaywrightCrawlingContext<Dictionary>>> => {
    const router = createPlaywrightRouter();
    router.addDefaultHandler(async (context) => await selogerDefaultHandler(context, dataProcessingService, job));
    return router;
}