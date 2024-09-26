import { initLogger } from "./logger.config";

const logger = initLogger('proxy');

export const initProxy = async (): Promise<string[]> => {
    logger.info('Initializing proxy...');
    return [
        'http://hephaestus.p.shifter.io:10065',
        'http://hephaestus.p.shifter.io:10066',
        'http://hephaestus.p.shifter.io:10067',
        'http://hephaestus.p.shifter.io:10068',
        'http://hephaestus.p.shifter.io:10069'
    ]
}