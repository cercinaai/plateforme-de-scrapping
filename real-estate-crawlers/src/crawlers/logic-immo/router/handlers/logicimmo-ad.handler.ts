import { Job } from "bullmq";
import { PlaywrightCrawlingContext } from "crawlee";
import { initLogger } from "../../../../config/logger.config";
import { CRAWLER_ORIGIN } from "../../../../utils/enum";
import { Page } from "playwright";
import { ingestData } from '../../../../data-ingestion/data.ingestion'

const logger = initLogger(CRAWLER_ORIGIN.LOGICIMMO);


export const logicImmoAdHandler = async (context: PlaywrightCrawlingContext) => {
    const { page, waitForSelector, closeCookieModals } = context;
    await page.waitForLoadState('load');
    await closeCookieModals();
    const adFound = await waitForSelector('body > main > .errorPageBox').then(() => false).catch(() => true);
    if (!adFound) {
        logger.info('Ad Not Found Exit...')
        return;
    }
    const cleaned_ad = await extract_ad(context);
    if (!cleaned_ad) return;
    await ingestData(cleaned_ad, CRAWLER_ORIGIN.LOGICIMMO);
}

const extract_ad = async (context: PlaywrightCrawlingContext): Promise<void | object> => {
    const { page } = context;
    const adDate = await extractDate(page);
    if (!adDate) return;
    const adList = await page.evaluate(() => window['thor']['dataLayer']['av_items']);
    if (!adList || !adList[0]) return;
    const agency = await extractAgency(page);
    if (!agency) return;
    const title = await extractTextContent(page, 'body > main > div > div.mainContent > div.offerDetailContainer > section > div.offerSummary.offerCreditPrice > h1 > p');
    const images = await extractImages(page);
    const description = await extractTextContent(page, 'body > main > div > div.mainContent > div.offerDetailContainer > section > div.nativeAds > div.blocDescrProperty > article > p.descrProperty');
    const gasCertificate = await extractTextContent(page, "body > main > div > div.mainContent > div.offerDetailContainer > section > section.energyDiagnosticContainer > div > article.GES > ul > li > span[tabindex]");
    const options = await extractOptions(page);
    let ad = {
        ...adList[0],
        ...agency,
        creationDate: adDate,
        lastCheckDate: adDate,
        title,
        pictureUrl: images.length > 0 ? images[0] : '',
        pictureUrls: images,
        description,
        gas_certificate: gasCertificate,
        options
    };
    ad = Object.fromEntries(Object.entries(ad).filter(([_, value]) => value !== undefined));
    return ad;
}

const extractDate = async (page: Page): Promise<Date | null> => {
    const adDateElement = await page.$('.offer-description-notes');
    if (!adDateElement) return null;

    const adDateText = await adDateElement.textContent();
    const dateMatch = adDateText?.match(/Mis à jour:\s*(\d{2}\/\d{2}\/\d{4})/);
    if (!dateMatch) return null;

    return new Date(dateMatch[1].split('/').reverse().join('-'));
};

const extractAgency = async (page: Page): Promise<{ agencyName: string; agencyUrl: string; agencyPhoneNumber: string } | null> => {
    const agencyNameElement = await page.$('.agencyName');
    const agencyUrlElement = await page.$("[data-js-agencyurl]:not([data-js-agencyurl=''])");
    const agencyPhoneNumberElement = await page.$('.stickyContactContent > a');

    if (!agencyNameElement || !agencyUrlElement || !agencyPhoneNumberElement) return null;

    const agencyName = await agencyNameElement.textContent() || '';
    const agencyUrl = `https://www.logic-immo.com${await agencyUrlElement.getAttribute('data-js-agencyurl')}`;
    const agencyPhoneNumberHref = await agencyPhoneNumberElement.getAttribute('href') || '';
    const agencyPhoneNumber = agencyPhoneNumberHref.split(':').pop() || '';

    return { agencyName, agencyUrl, agencyPhoneNumber };
};

const extractTextContent = async (page: Page, selector: string): Promise<string> => {
    const element = await page.$(selector);
    return element ? (await element.textContent()) || '' : '';
};

const extractImages = async (page: Page): Promise<string[]> => {
    const imageElements = await page.$$('.swiper-slide > picture > img');
    const images = imageElements.map(async (img) => (await img.getAttribute('src')) || (await img.getAttribute('data-src')) || '');
    return Promise.all(images);
};

const extractOptions = async (page: Page): Promise<string[]> => {
    const optionElements = await page.$$('.dtlTechiqueItm');
    const options = optionElements.map(async (option) => await option.textContent());
    return (await Promise.all(options)).filter((option) => option) as string[];
};