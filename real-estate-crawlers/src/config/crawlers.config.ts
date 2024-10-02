import { Configuration, LogLevel } from "crawlee";
import { CrawlerConfigModel } from "../models/mongodb/crawler-config.mongodb";

export const boncoinConfig = new Configuration({
    logLevel: LogLevel.ERROR,
    purgeOnStart: true,
    persistStorage: false,
    storageClientOptions: {
        persistStorage: false,
        writeMetadata: false,
    },
    availableMemoryRatio: 0.5,
    headless: true,
});

export const selogerConfig = new Configuration({
    logLevel: LogLevel.ERROR,
    purgeOnStart: true,
    persistStorage: false,
    storageClientOptions: {
        persistStorage: false,
        writeMetadata: false,
    },
    availableMemoryRatio: 0.5,
    headless: true,
});

export const bieniciConfig = new Configuration({
    logLevel: LogLevel.INFO,
    purgeOnStart: true,
    persistStorage: false,
    storageClientOptions: {
        persistStorage: false,
        writeMetadata: false,
    },
    availableMemoryRatio: 0.5,
    headless: true,
});

export const logicimmoConfig = new Configuration({
    logLevel: LogLevel.INFO,
    purgeOnStart: true,
    persistStorage: false,
    storageClientOptions: {
        persistStorage: false,
        writeMetadata: false,
    },
    availableMemoryRatio: 0.5,
    headless: true
});



export const generateDefaultCrawlersConfig = async () => {
    const haveConfig = await CrawlerConfigModel.exists({});
    if (haveConfig) return;
    await CrawlerConfigModel.create({
        can_crawl: true,
        api_key: process.env.API_KEY,
        proxy_urls: [
            'http://hephaestus.p.shifter.io:10065',
            'http://hephaestus.p.shifter.io:10066',
            'http://hephaestus.p.shifter.io:10067',
            'http://hephaestus.p.shifter.io:10068',
            'http://hephaestus.p.shifter.io:10069'
        ],
        seloger_config: {
            total: 10000,
            regions: [
                { name: 'Île-de-France', link: ['2238'], limit: 19.9 },
                { name: "Provence-Alpes-Côte d'Azur", link: ['2246'], limit: 14.06 },
                { name: 'Centre-Val de Loire', link: ['2234'], limit: 3.0 },
                { name: 'Bourgogne-Franche-Comté', link: ['2232'], limit: 3.15 },
                { name: 'Normandie', link: ['2236', '2231'], limit: 3.79 },
                { name: 'Hauts-de-France', link: ['2243', '2244'], limit: 5.33 },
                { name: 'Grand Est', link: ['2228', '2235', '2241'], limit: 5.92 },
                { name: 'Pays de la Loire', link: ['2247'], limit: 5.17 },
                { name: 'Bretagne', link: ['2233'], limit: 4.75 },
                { name: 'Nouvelle-Aquitaine', link: ['2229'], limit: 10.7 },
                { name: 'Occitanie', link: ['2239', '2242'], limit: 10.81 },
                { name: 'Auvergne-Rhône-Alpes', link: ['2251', '2230'], limit: 12.63 },
                { name: 'Corse', link: ['2248'], limit: 0.78 }
            ]
        },
        boncoin_limits: {
            total: 10000,
            regions: [
                { name: 'Île-de-France', link: 'r_12', limit: 19.65 },
                { name: "Provence-Alpes-Côte d'Azur", link: 'r_21', limit: 13.88 },
                { name: 'Centre-Val de Loire', link: 'r_37', limit: 2.97 },
                { name: 'Bourgogne-Franche-Comté', link: 'r_31', limit: 3.11 },
                { name: 'Normandie', link: 'r_34', limit: 3.74 },
                { name: 'Hauts-de-France', link: 'r_32', limit: 5.26 },
                { name: 'Grand Est', link: 'r_33', limit: 5.84 },
                { name: 'Pays de la Loire', link: 'r_18', limit: 5.1 },
                { name: 'Bretagne', link: 'r_6', limit: 4.68 },
                { name: 'Nouvelle-Aquitaine', link: 'r_35', limit: 10.56 },
                { name: 'Occitanie', link: 'r_36', limit: 10.68 },
                { name: 'Auvergne-Rhône-Alpes', link: 'r_30', limit: 12.47 },
                { name: 'Corse', link: 'r_9', limit: 0.78 },
                { name: 'Guadeloupe', link: 'r_23', limit: 0.64 },
                { name: 'Martinique', link: 'r_24', limit: 0.46 },
                { name: 'Guyane', link: 'r_25', limit: 0.18 }
            ]
        },
        logicimmo_limits: {
            total: 2699,
            regions: [
                { name: 'Île-de-France', link: 'ile-de-france,1_0', limit: 20.86 },
                { name: "Provence-Alpes-Côte d'Azur", link: 'provence-alpes-cote-d-azur,21_0', limit: 14.75 },
                { name: 'Centre-Val de Loire', link: 'centre,5_0', limit: 3.15 },
                { name: 'Bourgogne-Franche-Comté', link: 'Bourgogne,7_0', limit: 3.3 },
                { name: 'Normandie', link: 'haute-normandie,basse-normandie,4_0,6_0', limit: 3.96 },
                { name: 'Hauts-de-France', link: 'picardie,nord-pas-de-calais,3_0,8_0', limit: 5.56 },
                { name: 'Grand Est', link: 'champagne-ardenne,lorraine,alsace,2_0,9_0,10_0', limit: 6.22 },
                { name: 'Pays de la Loire', link: 'pays-de-la-loire,12_0', limit: 5.41 },
                { name: 'Bretagne', link: 'bretagne,13_0', limit: 4.96 },
                { name: 'Nouvelle-Aquitaine', link: 'aquitaine,15_0', limit: 11.23 },
                { name: 'Occitanie', link: 'midi-pyrenees,languedoc-roussillon,16_0,20_0', limit: 5.67 },
                { name: 'Auvergne-Rhône-Alpes', link: 'Auvergne,19_0', limit: 13.23 },
                { name: 'Corse', link: 'corse,22_0', limit: 0.85 },
                { name: 'Guadeloupe', link: 'guadeloupe-97,40266_1', limit: 0.67 },
                { name: 'Guyane', link: 'guyane-973,la-reunion-97,martinique-97,40267_1,40270_1,40269_1', limit: 0.19 }
            ]
        },
        bienici_limits: {
            total: 1500,
            regions: []
        },
    });
}