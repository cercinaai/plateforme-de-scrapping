import { createPlaywrightRouter, Dictionary, PlaywrightCrawlingContext, RouterHandler } from "crawlee";
import { leboncoinGolfDefaultHandler } from "./handlers/boncoin-golf-default.handler";
import { Job } from "bullmq";

export const createLeboncoinGolfRouter = async (job: Job): Promise<RouterHandler<PlaywrightCrawlingContext<Dictionary>>> => {
  const router = createPlaywrightRouter();
  router.addDefaultHandler(async (context) => await leboncoinGolfDefaultHandler(job, context));
  return router;
}
