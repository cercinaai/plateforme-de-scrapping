import { Job } from "bullmq";
import { createPlaywrightRouter, Dictionary, PlaywrightCrawlingContext, RouterHandler } from "crawlee";
import { bieniciDefaultHandler } from "./handlers/bienici-default.handler";
import { bieniciAdHandler } from "./handlers/bienici-ad.handler";

export const createBieniciRouter = async (job: Job): Promise<RouterHandler<PlaywrightCrawlingContext<Dictionary>>> => {
    const router = createPlaywrightRouter();
    router.addDefaultHandler(async (context) => await bieniciDefaultHandler(job, context));
    router.addHandler('ad-single-url', async (context) => await bieniciAdHandler(context))
    return router;
}