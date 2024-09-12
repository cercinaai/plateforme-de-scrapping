import { Job } from "bull";
import { PlaywrightCrawlingContext } from "crawlee";
import { CRAWLER_ORIGIN } from "src/crawler/utils/enum";
import { DataProcessingService } from "src/data-processing/data-processing.service";

export const bieniciAdHandler = async (context: PlaywrightCrawlingContext, dataProcessingService: DataProcessingService, job: Job) => {
    const { page } = context;
    await page.waitForLoadState('networkidle');
    const ad = await page.evaluate(() => window['sigle_ad']);
    if (!ad) return;
    await dataProcessingService.process([ad], CRAWLER_ORIGIN.BIENICI);
    await job.update({
        ...job.data,
        total_data_grabbed: job.data['total_data_grabbed'] + 1,
    })
}