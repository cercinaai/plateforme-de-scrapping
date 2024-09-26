import { Job } from "bullmq";
import { createPlaywrightRouter, Dictionary, PlaywrightCrawlingContext, RouterHandler } from "crawlee";
import { selogerDefaultHandler } from "./handlers/seloger-default.handler";



export const createSelogerRouter = async (job: Job): Promise<RouterHandler<PlaywrightCrawlingContext<Dictionary>>> => {
    const router = createPlaywrightRouter();
    router.addDefaultHandler(async (context) => await selogerDefaultHandler(job, context));
    return router;
}


export const build_link = (job: Job) => {
    const { link } = job.data.france_locality[job.data.REGION_REACHED]
    const grouped_urls = link.map((l: string) => ({ divisions: [parseInt(l)] }))
    const string_urls = JSON.stringify(grouped_urls)
    return `https://www.seloger.com/list.htm?projects=2,5&types=2,4,1,13,9,3,14,12,11,10&natures=1,2,4&places=${string_urls}&sort=d_dt_crea&mandatorycommodities=0&privateseller=0&enterprise=0&houseboat=1&qsVersion=1.0&m=search_refine-redirection-search_results`

}