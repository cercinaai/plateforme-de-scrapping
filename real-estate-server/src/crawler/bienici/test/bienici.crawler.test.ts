import { Configuration, createPlaywrightRouter, LogLevel, PlaywrightCrawler } from "crawlee";
import { bieniciCrawlerOption } from "../../../config/playwright.config";
import axios from "axios";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import dotenv from 'dotenv';

dotenv.config({ path: 'real-estate.env' });

const save_files = async (url: string) => {
    const fileName = url.split('/').pop();
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const fileBuffer = Buffer.from(response.data, 'binary');
    const s3 = new S3Client({
        endpoint: process.env.AWS_S3_ENDPOINT,
        region: 'eu-central-003',
        credentials: {
            accessKeyId: process.env.AWS_S3_ACCESS_KEY,
            secretAccessKey: process.env.AWS_S3_SECRET_KEY,
        }
    });
    await s3.send(new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: `b/${fileName}`,
        Body: fileBuffer
    }));
    console.log(`https://f003.backblazeb2.com/file/${process.env.AWS_S3_BUCKET_NAME}/b/${fileName}`);
}

const PAGE_LIMIT = 20
let page_reached = 1;
const router = createPlaywrightRouter();

router.addDefaultHandler(async (context) => {
    const { page, enqueueLinks } = context;
    await page.waitForLoadState('networkidle');
    const ads = await page.evaluate(() => window['crawled_ads']);
    const baseUrl = 'https://www.bienici.com';
    const photo_urls = ads.flatMap((ad: any) => ad.photos);
    await save_files(photo_urls[0].url);
    // const links_urls = await Promise.all(ads.map(async (ad: any) => {
    //     const adLinkHtml = await page.$(`article[data-id="${ad.id}"]  a`);
    //     const adLink = await adLinkHtml?.getAttribute('href');
    //     return adLink ? `${baseUrl}${adLink}` : ''
    // }));
    // await enqueueLinks({ urls: links_urls, label: 'ad-single-url' });
    // if (page_reached >= PAGE_LIMIT) return;
    // page_reached += 1;
    // const nextPageHtml = await page.$("#searchResultsContainer > div.vue-pagination.pagination > div.pagination__nav-buttons > a.pagination__go-forward-button");
    // const nextPage = await nextPageHtml?.getAttribute('href');
    // if (nextPage) {
    //     await enqueueLinks({ urls: [`https://www.bienici.com${nextPage}`] });
    // }
});
router.addHandler('ad-single-url', async (context) => {
    const { page } = context;
    await page.waitForLoadState('domcontentloaded');
});

const bieniciCrawler = new PlaywrightCrawler({
    ...bieniciCrawlerOption,
    preNavigationHooks: [async (context) => {
        const { page, log } = context;
        page.on('response', async (response) => {
            const url = response.url();
            if (url.match(/realEstateAd\.json\?id=.*$/)) {
                // SINGLE AD PAGE
                let body = await response.json();
                if (body) {
                    log.info('AD FOUND');
                }
            }
            if (url.match(/realEstateAds\.json\?filters=.*$/)) {
                // LIST PAGE
                let body = await response.json();
                if (body) {
                    log.info('LIST FOUND');
                    let ads = body.realEstateAds || [];
                    await page.evaluate((ads) => { window['crawled_ads'] = ads; }, ads);
                }
            }
        })
    }],
    errorHandler: (context, error) => { context.log.error(error.message) },
    requestHandler: router,
}, new Configuration({
    logLevel: LogLevel.INFO,
    purgeOnStart: true,
    persistStorage: false,
    storageClientOptions: {
        persistStorage: false,
        writeMetadata: false,
    },
    headless: false,
}));


const test = async () => {
    await bieniciCrawler.run(['https://www.bienici.com/recherche/achat/france/maisonvilla,appartement,parking,terrain,loft,commerce,batiment,chateau,local,bureau,hotel,autres?mode=liste&tri=publication-desc']);
    await bieniciCrawler.teardown();
}

test().then(() => console.log('TEST FINISHED'))