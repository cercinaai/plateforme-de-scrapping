import { Configuration, createPlaywrightRouter, LogLevel, PlaywrightCrawler, PlaywrightCrawlingContext, RequestQueue } from "crawlee";
import { logicimmoCrawlerOption } from "../../config/playwright.config";
import { EstateOptionDocument } from "src/models/estateOption.schema";

const logicImmoRouter = createPlaywrightRouter();
const franceLocality = [
    'ile-de-france,1_0', 'alsace,10_0', 'aquitaine,15_0', 'Auvergne,19_0', 'Bretagne,13_0',
    'centre,5_0', 'Bourgogne,7_0', 'champagne-ardenne,2_0', 'corse,22_0',
    'franche-comte,11_0', 'languedoc-roussillon,20_0', 'limousin,17_0', 'lorraine,9_0',
    'basse-normandie,6_0', 'midi-pyrenees,16_0', 'nord-pas-de-calais,8_0', 'pays-de-la-loire,12_0',
    'picardie,3_0', 'poitou-charentes,14_0', 'provence-alpes-cote-d-azur,21_0', 'rhone-alpes,18_0', 'haute-normandie,4_0'
]
let localite_index = 0;
let LIMIT_REACHED = false;
let list_page = 1;
const current_date = new Date();
const previousDay = new Date(current_date);
previousDay.setDate(previousDay.getDate() - 1);

logicImmoRouter.addDefaultHandler(async (context) => {
    const { page, enqueueLinks, closeCookieModals, log } = context;
    await closeCookieModals();
    await page.waitForTimeout(1200);
    const ads = await page.evaluate(() => window['thor']['dataLayer']['av_items']);
    const ads_links = ads.map((ad: any) => `https://www.logic-immo.com/detail-vente-${ad.id}.htm`);
    await enqueueLinks({ urls: ads_links, label: 'ad-single-url' });
    if (LIMIT_REACHED) {
        if (localite_index < franceLocality.length - 1) {
            log.info('NEXT LOCALITY');
            localite_index++;
            list_page = 1;
            LIMIT_REACHED = false;
            await enqueueLinks({ urls: [build_link()] });
        } else {
            log.info('FINISH TEST');
            return;
        }

    }
    list_page++;
    log.info(`PAGE ${list_page} INSIDE LOCALITY ${franceLocality[localite_index]}`);
    await enqueueLinks({ urls: [build_link()] });
});

logicImmoRouter.addHandler('ad-single-url', async (context) => {
    const { page, log } = context;
    await page.waitForLoadState('domcontentloaded');
    const adNotFound = await page.$('body > main > .errorPageBox');
    if (adNotFound) {
        log.info('AD NOT FOUND');
        return;
    }
    const ad_date_brute = await (await page.$('.offer-description-notes')).textContent();
    const extracted_date_match = ad_date_brute.match(/Mis à jour:\s*(\d{2}\/\d{2}\/\d{4})/);
    const ad_date = new Date(extracted_date_match[1].toString().split('/').reverse().join('-'))
    log.info(`AD DATE => ${ad_date} vs Current ${current_date} vs Previous ${previousDay}`);
    if (!isSameDay(ad_date, current_date) && !isSameDay(ad_date, previousDay)) {
        log.info(`AD OUTDATED => ${ad_date} vs ${current_date} vs ${previousDay}`);
        LIMIT_REACHED = true;
        return;
    }
    const ad_list = await page.evaluate(() => window['thor']['dataLayer']['av_items']);
    if (!ad_list || !ad_list[0]) return;
    let ad = ad_list[0];
    const agency = await extractAgency(context);
    if (!agency) return;
    const titleElement = await page.$('body > main > div > div.mainContent > div.offerDetailContainer > section > div.offerSummary.offerCreditPrice > h1 > p');
    const pictureUrlElement = (await page.$$('.swiper-slide > picture > img')).map(async (img) => await img.getAttribute('src') || await img.getAttribute('data-src'));
    const descriptionElement = await page.$('body > main > div > div.mainContent > div.offerDetailContainer > section > div.nativeAds > div.blocDescrProperty > article > p.descrProperty');
    const gas_certificateElement = await page.$("body > main > div > div.mainContent > div.offerDetailContainer > section > section.energyDiagnosticContainer > div > article.GES > ul > li > span[tabindex]");
    const OptionsElement = (await page.$$('.dtlTechiqueItm')).map(async (option) => await option.textContent());
    const extractedOption = (await Promise.all(OptionsElement)).filter((option) => option);
    const cleanOptions = extractOptions(extractedOption);
    ad = {
        ...ad,
        title: titleElement ? await titleElement.textContent() : '',
        pictureUrl: pictureUrlElement ? await pictureUrlElement[0] : '',
        pictureUrls: pictureUrlElement ? await Promise.all(pictureUrlElement) : [],
        description: descriptionElement ? await descriptionElement.textContent() : '',
        gas_certificate: gas_certificateElement ? await gas_certificateElement.textContent() : '',
        options: cleanOptions
    };
    log.info(`AD PROCESSED => ${ad.id.toString()}`);
});
const extractOptions = (data: any): Partial<EstateOptionDocument> => {
    let estateOption: Partial<EstateOptionDocument> = {};
    for (let option of data) {
        const trimmedItem = option.trim();
        if (trimmedItem.includes('Terrasse/Balcon') && trimmedItem.includes('Terrasse')) {
            estateOption.hasTerrace = true;
            continue;
        }
        if (trimmedItem.includes('Terrasse/Balcon') && trimmedItem.includes('Balcon')) {
            estateOption.hasBalcony = true;
            continue;
        }
        if (trimmedItem.includes('Cave')) {
            estateOption.hasCellar = true;
            continue;
        }
        if (trimmedItem.includes('Ascenseur')) {
            estateOption.hasElevator = true;
            continue;
        }
        if (trimmedItem.includes('Piscine')) {
            estateOption.hasPool = true;
            continue;
        }
        if (trimmedItem.includes('Garage')) {
            estateOption.hasGarage = true;
            continue;
        }
        if (trimmedItem.includes('Jardin/Terrain') && trimmedItem.includes('Jardin')) {
            estateOption.hasGarden = true;
            continue;
        }
        if (trimmedItem.includes('Air conditionné')) {
            estateOption.hasAirConditioning = true;
            continue;
        }
        if (trimmedItem.includes('Accès Handicapé')) {
            estateOption.isDisabledPeopleFriendly = true;
            continue;
        }
        if (trimmedItem.includes('Gardien')) {
            estateOption.hasCaretaker = true;
            continue;
        }
    }
    return estateOption;
}
const extractAgency = async ({ page }: PlaywrightCrawlingContext): Promise<{ agencyName: string, agencyUrl: string, agencyPhoneNumber: string }> => {
    const agencyName = await (await page.$('.agencyName')).textContent();
    const agencyUrlElement = await page.$("[data-js-agencyurl]:not([data-js-agencyurl=''])");
    const agencyUrl = agencyUrlElement ? `https://www.logic-immo.com${await agencyUrlElement.getAttribute('data-js-agencyurl')}` : '';
    const agencyPhoneNumber = (await (await page.$('.stickyContactContent > a')).getAttribute('href')).split(':').pop();
    return { agencyName, agencyUrl, agencyPhoneNumber }
}
const isSameDay = (date1: Date, date2: Date) => {
    return date1.getUTCFullYear() === date2.getUTCFullYear() &&
        date1.getUTCMonth() === date2.getUTCMonth() &&
        (date1.getUTCDate() === date2.getUTCDate());
}
const build_link = (): string => {
    return `https://www.logic-immo.com/vente-immobilier-${franceLocality[localite_index]}/options/groupprptypesids=1,2,6,7,12,3,18,4,5,14,13,11,10,9,8/searchoptions=0,1/page=${list_page}/order=update_date_desc`;
}
const createCrawler = async (): Promise<PlaywrightCrawler> => {
    return new PlaywrightCrawler({
        ...logicimmoCrawlerOption,
        requestQueue: await RequestQueue.open('logic-immo-queue'),
        requestHandler: logicImmoRouter,
    }, new Configuration({
        logLevel: LogLevel.INFO,
        purgeOnStart: true,
        persistStorage: false,
        storageClientOptions: {
            persistStorage: false,
            writeMetadata: false,
        },
        headless: true,
    }));
}


const test = async () => {
    const logicImmo = await createCrawler();
    await logicImmo.run(['https://www.logic-immo.com/vente-immobilier-ile-de-france,1_0/options/groupprptypesids=1,2,6,7,12,3,18,4,5,14,13,11,10,9,8/searchoptions=0,1,3/page=1/order=update_date_desc']);
    await logicImmo.requestQueue.drop();
    await logicImmo.teardown();
}


test().then(() => console.log('TEST FINISHED'))
