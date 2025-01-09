import { Job } from "bullmq";
import { PlaywrightCrawlingContext } from "crawlee";
import { createCursor } from "ghost-cursor-playwright";
import { detectDataDomeCaptcha } from "../../../../utils/captcha.detect";
import { ingestData } from "../../../../data-ingestion/data.ingestion";
import { CRAWLER_ORIGIN } from "../../../../utils/enum";
import { ElementHandle } from "playwright";
import { scrollToTargetHumanWay } from '../../../../utils/human-behavior.util';
import { initLogger } from "../../../../config/logger.config";

const logger = initLogger(CRAWLER_ORIGIN.LEBONCOIN_GOLF);

export const leboncoinGolfDefaultHandler = async (job: Job, context: PlaywrightCrawlingContext) => {
  const { page, closeCookieModals, waitForSelector, enqueueLinks } = context;
  let { DATA_REACHED } = job.data;
  let { name, limit } = job.data.france_locality[job.data.REGION_REACHED];
  let { REGION_REACHED, PAGE_REACHED } = job.data;
  await page.waitForLoadState('load');
  await detectDataDomeCaptcha(context, true);
  await closeCookieModals();
  const cursor = await createCursor(page as any);

  // PAGE LOOP
  let ads: any;
  while (DATA_REACHED < limit) {
    await waitForSelector("a[data-qa-id='pagination-link-next']", 10000);
    await cursor.actions.randomMove();
    if (PAGE_REACHED === 1) {
      ads = await page.$$eval("a[data-test-id='ad']", (elements) =>
        elements.map((el) => ({
          _id: el.getAttribute('href')?.split('/').pop(),
          link: `https://www.leboncoin.fr${el.getAttribute('href')}`,
        }))
      );
    }
    if (!ads) throw new Error('No ads found');
    await ingestData(ads, CRAWLER_ORIGIN.LEBONCOIN_GOLF);
    DATA_REACHED += ads.length;
    let ads_numbers = ads.length;
    ads = null;
    const nextButton = await page.$("a[data-qa-id='pagination-link-next']") as ElementHandle<SVGElement | HTMLElement>;
    const nextButtonPosition = await nextButton.boundingBox() as { x: number, y: number };
    await scrollToTargetHumanWay(context, nextButtonPosition?.y);
    await page.mouse.move(nextButtonPosition.x - 10, nextButtonPosition.y - 10);
    await page.click("a[data-qa-id='pagination-link-next']");
    await page.waitForTimeout(2000);
    logger.info(`Data grabbed: ${DATA_REACHED} of ${limit} for (${name}) in page (${PAGE_REACHED})`);
    PAGE_REACHED++;
    await job.updateData({ ...job.data, PAGE_REACHED: PAGE_REACHED, DATA_REACHED: DATA_REACHED, total_data_grabbed: job.data.total_data_grabbed + ads_numbers });
  }
  if (REGION_REACHED >= job.data.france_locality.length - 1) return;
  await job.updateData({ ...job.data, DATA_REACHED: 0, REGION_REACHED: REGION_REACHED + 1, PAGE_REACHED: 1 });
  await enqueueLinks({ urls: [build_link(job)] });
}

export const build_link = (job: Job): string => {
  const { link } = job.data.france_locality[job.data.REGION_REACHED];
  return `https://www.leboncoin.fr/recherche?category=2&u_car_brand=VOLKSWAGEN&u_car_model=VOLKSWAGEN_Golf&sort=time${link ? `&locations=${link}` : ''}`;
}
