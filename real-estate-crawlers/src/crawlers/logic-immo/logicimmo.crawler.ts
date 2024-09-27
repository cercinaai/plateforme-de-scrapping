import { Job } from "bullmq";
import { FinalStatistics, PlaywrightCrawler, ProxyConfiguration, RequestQueue } from "crawlee";
import { initLogger } from "../../config/logger.config";
import { CRAWLER_ORIGIN } from "../../utils/enum";
import { initProxy } from "../../config/proxy.config";
import { logicimmoCrawlerOption } from "../../config/playwright.config";
import { logicimmoConfig } from "../../config/crawlers.config";
import { handleFailedCrawler } from "../../utils/handleCrawlerState.util";
import { build_link, createLogicimmoRouter } from "./router/logicimmo.router";

const logger = initLogger(CRAWLER_ORIGIN.LOGICIMMO);


export const start_logicimmo_crawler = async (job: Job) => {
    logger.info('Starting logicimmo crawler...');
    await initialize(job);
    const crawler = await create_crawler(job);
    const statistics = await crawl(job, crawler).catch(async (err) => {
        if (crawler.requestQueue) {
            await crawler.requestQueue.drop();
        }
        await crawler.teardown();
        throw err;
    });
    logger.info('Logicimmo crawler finished!');
    return statistics;
}


const initialize = async (job: Job) => {
    logger.info('Initializing logicimmo crawler...');
    await job.updateData({
        total_data_grabbed: 0,
        status: 'running',
        REGION_REACHED: 0,
        PAGE_REACHED: 1,
        DATA_REACHED: 0,
        france_locality: [
            { name: 'Île-de-France', link: 'ile-de-france,1_0', limit: 563 },
            { name: "Provence-Alpes-Côte d'Azur", link: 'provence-alpes-cote-d-azur,21_0', limit: 398 },
            { name: 'Centre-Val de Loire', link: 'centre,5_0', limit: 85 },
            { name: 'Bourgogne-Franche-Comté', link: 'Bourgogne,7_0', limit: 89 },
            { name: 'Normandie', link: 'haute-normandie,basse-normandie,4_0,6_0', limit: 107 },
            { name: 'Hauts-de-France', link: 'picardie,nord-pas-de-calais,3_0,8_0', limit: 150 },
            { name: 'Grand Est', link: 'champagne-ardenne,lorraine,alsace,2_0,9_0,10_0', limit: 168 },
            { name: 'Pays de la Loire', link: 'pays-de-la-loire,12_0', limit: 146 },
            { name: 'Bretagne', link: 'bretagne,13_0', limit: 134 },
            { name: 'Nouvelle-Aquitaine', link: 'aquitaine,15_0', limit: 303 },
            { name: 'Occitanie', link: 'midi-pyrenees,languedoc-roussillon,16_0,20_0', limit: 153 },
            { name: 'Auvergne-Rhône-Alpes', link: 'Auvergne,19_0', limit: 357 },
            { name: 'Corse', link: 'corse,22_0', limit: 23 },
            { name: 'Guadeloupe', link: 'guadeloupe-97,40266_1', limit: 18 },
            { name: 'Guyane', link: 'guyane-973,la-reunion-97,martinique-97,40267_1,40270_1,40269_1', limit: 5 },
        ]
    })
    logger.info('Logicimmo crawler initialized!');
}

const create_crawler = async (job: Job): Promise<PlaywrightCrawler> => {
    logger.info('Creating logicimmo crawler...');
    const logicimmoQueue = await RequestQueue.open('logicimmo-crawler-queue');
    const proxy_list = await initProxy();
    const router = await createLogicimmoRouter(job);
    return new PlaywrightCrawler({
        ...logicimmoCrawlerOption,
        requestQueue: logicimmoQueue,
        proxyConfiguration: new ProxyConfiguration({ proxyUrls: proxy_list }),
        requestHandler: router,
        failedRequestHandler: async (context, error) => handleFailedCrawler(job, context, error),
        errorHandler: (_, error) => {
            logger.error(error);
        },
    }, logicimmoConfig);
}

const crawl = async (job: Job, crawler: PlaywrightCrawler): Promise<FinalStatistics> => {
    logger.info('Starting logicimmo crawler...');
    const statistics = await crawler.run([build_link(job)]);
    await crawler.requestQueue?.drop();
    await crawler.teardown();
    return statistics;
}