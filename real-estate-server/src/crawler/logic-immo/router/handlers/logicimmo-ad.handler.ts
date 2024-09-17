import { Job } from "bull";
import { PlaywrightCrawlingContext } from "crawlee";
import { Page } from "playwright";
import { isSameDayOrBefore } from "src/crawler/utils/date.util";
import { CRAWLER_ORIGIN } from "src/crawler/utils/enum";
import { DataProcessingService } from "src/data-processing/data-processing.service";

export const logicImmoAdHandler = async (context: PlaywrightCrawlingContext, dataProcessingService: DataProcessingService, job: Job) => {
    const { page, waitForSelector, log, closeCookieModals } = context;
    await page.waitForLoadState('domcontentloaded');
    await closeCookieModals();
    try {
        await waitForSelector('body > main > .errorPageBox').then(() => {
            log.info('Ad not found');
            throw new Error('Ad not found');
        }).catch(() => { })
    } catch (error) {
        if (error.message === 'Ad not found') return;
        throw error;
    }
    try {
        let ad_date_brute_element = await page.$('.offer-description-notes');
        if (!ad_date_brute_element) return;
        const ad_date_brute = await ad_date_brute_element.textContent();
        const extracted_date_match = ad_date_brute.match(/Mis à jour:\s*(\d{2}\/\d{2}\/\d{4})/);
        const ad_date = new Date(extracted_date_match[1].toString().split('/').reverse().join('-'))
        const { data_grabbed, limit } = job.data['france_localities'][job.data.localite_index];
        // if (!isSameDayOrBefore({ target_date: ad_date, check_date: job.data.check_date, returnDays: 1 })) return;
        if (data_grabbed >= limit) return job.update({ ...job.data, LIMIT_REACHED: true });
        const ad_list = await page.evaluate(() => window['thor']['dataLayer']['av_items']);
        if (!ad_list || !ad_list[0]) return;
        let ad = ad_list[0];
        const agency = await extractAgency(page);
        if (!agency) return;
        const titleElement = await page.$('body > main > div > div.mainContent > div.offerDetailContainer > section > div.offerSummary.offerCreditPrice > h1 > p');
        const pictureUrlElement = (await page.$$('.swiper-slide > picture > img')).map(async (img) => await img.getAttribute('src') || await img.getAttribute('data-src'));
        const descriptionElement = await page.$('body > main > div > div.mainContent > div.offerDetailContainer > section > div.nativeAds > div.blocDescrProperty > article > p.descrProperty');
        const gas_certificateElement = await page.$("body > main > div > div.mainContent > div.offerDetailContainer > section > section.energyDiagnosticContainer > div > article.GES > ul > li > span[tabindex]");
        const OptionsElement = (await page.$$('.dtlTechiqueItm')).map(async (option) => await option.textContent());
        const extractedOption = (await Promise.all(OptionsElement)).filter((option) => option);
        ad = {
            ...ad,
            ...agency,
            creationDate: ad_date,
            lastCheckDate: ad_date,
            title: titleElement ? await titleElement.textContent() : '',
            pictureUrl: pictureUrlElement ? await pictureUrlElement[0] : '',
            pictureUrls: pictureUrlElement ? await Promise.all(pictureUrlElement) : [],
            description: descriptionElement ? await descriptionElement.textContent() : '',
            gas_certificate: gas_certificateElement ? await gas_certificateElement.textContent() : '',
            options: extractedOption
        };
        const safeJobData = Object.fromEntries(
            Object.entries(ad).filter(([key, value]) => value !== undefined)
        );
        await dataProcessingService.process([safeJobData], CRAWLER_ORIGIN.LOGICIMMO);
        const france_localities = job.data['france_localities'];
        france_localities[job.data.localite_index].data_grabbed = data_grabbed + 1
        await job.update({
            ...job.data,
            total_data_grabbed: job.data.total_data_grabbed + 1,
            france_localities
        });
    } catch (error) {
        log.error(error);
        return;
    }
}

const extractAgency = async (page: Page): Promise<{ agencyName: string, agencyUrl: string, agencyPhoneNumber: string }> => {
    const agencyNameElement = await page.$('.agencyName');
    if (!agencyNameElement) return null;
    const agencyName = await agencyNameElement.textContent();
    if (!agencyName) return null;
    const agencyUrlElement = await page.$("[data-js-agencyurl]:not([data-js-agencyurl=''])");
    if (!agencyUrlElement) return null;
    const agencyUrl = `https://www.logic-immo.com${await agencyUrlElement.getAttribute('data-js-agencyurl')}`;
    if (!agencyUrl) return null;
    const agencyPhoneNumberElement = await page.$('.stickyContactContent > a');
    if (!agencyPhoneNumberElement) return null;
    const agencyPhoneNumber = (await agencyPhoneNumberElement.getAttribute('href')).split(':').pop();
    if (!agencyPhoneNumber) return null;
    return { agencyName, agencyUrl, agencyPhoneNumber };
}