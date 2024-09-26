import { createPlaywrightRouter, Dictionary, PlaywrightCrawlingContext, RouterHandler } from "crawlee";
import { boncoinDefaultHandler } from "./handlers/boncoin-default.handler";
import { Job } from "bullmq";


export const createBoncoinRouter = async (job: Job): Promise<RouterHandler<PlaywrightCrawlingContext<Dictionary>>> => {
    const router = createPlaywrightRouter();
    router.addDefaultHandler(async (context) => await boncoinDefaultHandler(job, context));
    return router;
}