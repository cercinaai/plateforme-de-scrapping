import { Job } from "bull";
import { PlaywrightCrawlingContext } from "crawlee";
import { createCursor } from "ghost-cursor-playwright";
import { detectDataDomeCaptcha } from "src/crawler/utils/captcha.detect";
import { CRAWLER_ORIGIN } from "src/crawler/utils/enum";
import { scrollToTargetHumanWay } from "src/crawler/utils/human-behavior.util";
import { DataProcessingService } from "src/data-processing/data-processing.service";



export const selogerDefaultHandler = async (context: PlaywrightCrawlingContext, dataProcessingService: DataProcessingService, job: Job) => {
    const { page, closeCookieModals, waitForSelector, enqueueLinks, log, adsHttpInterceptor } = context;
    await page.waitForLoadState('load');
    await detectDataDomeCaptcha(context);
    const cursor = await createCursor(page);
    await cursor.actions.randomMove();
    await closeCookieModals().catch(() => { });
    await waitForSelector('a[data-testid="gsl.uilib.Paging.nextButton"]', 10000).catch(async () => {
        await page.goBack({ waitUntil: 'load' });
        await page.goForward({ waitUntil: 'load' });
        await waitForSelector('a[data-testid="gsl.uilib.Paging.nextButton"]');
        await closeCookieModals().catch(() => { });
    });
    let data_grabbed = 0;
    let { name, limit } = job.data.france_locality[job.data.REGION_REACHED];
    const nextButton = await page.$('a[data-testid="gsl.uilib.Paging.nextButton"]');
    const nextButtonPosition = await nextButton.boundingBox();
    let ads = await page.evaluate(() => Array.from(window['initialData']['cards']['list']).filter(card => card['cardType'] === 'classified'));
    if (ads.length > 0) {
        await dataProcessingService.process(ads, CRAWLER_ORIGIN.SELOGER);
        data_grabbed += ads.length;
        log.info(`Data grabbed: ${data_grabbed} of ${limit} for (${job.data.france_locality[job.data.REGION_REACHED].name})`);
    }
    await scrollToTargetHumanWay(context, nextButtonPosition.y);
    await page.mouse.move(nextButtonPosition.x - 10, nextButtonPosition.y - 10);
    await nextButton.scrollIntoViewIfNeeded();
    await nextButton.click();
    await page.waitForTimeout(2000);
    while (data_grabbed < limit) {
        await closeCookieModals().catch(() => { });
        const cursor = await createCursor(page);
        await cursor.actions.randomMove();
        await waitForSelector('a[data-testid="gsl.uilib.Paging.nextButton"]').catch(async () => {
            await page.goBack({ waitUntil: 'load' });
            await page.goForward({ waitUntil: 'load' });
            await waitForSelector('a[data-testid="gsl.uilib.Paging.nextButton"]');
            await closeCookieModals().catch(() => { });
        });
        const nextButton = await page.$('a[data-testid="gsl.uilib.Paging.nextButton"]');
        const nextButtonPosition = await nextButton.boundingBox();
        const intercepted_ads: any = await adsHttpInterceptor;
        const transformed_ads = await intercepted_ads.json();
        const cleaned_ads = transformed_ads.filter((card: any) => card['type'] === 0);
        const formatted_ads = cleaned_ads.map((card: any) => card['listing']);
        await dataProcessingService.process(formatted_ads, CRAWLER_ORIGIN.SELOGER);
        data_grabbed += formatted_ads.length;
        await scrollToTargetHumanWay(context, nextButtonPosition.y);
        await page.mouse.move(nextButtonPosition.x - 10, nextButtonPosition.y - 10);
        await nextButton.scrollIntoViewIfNeeded();
        await nextButton.click();
        await page.waitForTimeout(2000);
        log.info(`Data grabbed: ${data_grabbed} of ${limit} for (${name})`);
    }
    // NEXT LOCALITY
    if (job.data.REGION_REACHED >= job.data.france_locality.length - 1) return;
    await job.update({ ...job.data, REGION_REACHED: job.data.REGION_REACHED + 1, total_data_grabbed: job.data.total_data_grabbed + data_grabbed });
    await enqueueLinks({ urls: [build_link(job)] });
}


const build_link = (job: Job): string => {
    const { link } = job.data.france_locality[job.data.REGION_REACHED]
    const grouped_urls = link.map((l: string) => ({ divisions: [parseInt(l)] }))
    const string_urls = JSON.stringify(grouped_urls)
    return `https://www.seloger.com/list.htm?projects=2,5&types=2,4,1,13,9,3,14,12,11,10&natures=1,2,4&places=${string_urls}&sort=d_dt_crea&mandatorycommodities=0&privateseller=0&enterprise=0&houseboat=1&qsVersion=1.0&m=search_refine-redirection-search_results`
}

