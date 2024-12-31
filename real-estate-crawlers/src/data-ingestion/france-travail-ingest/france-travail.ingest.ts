import { clean_france_travail_data } from "./france-travail-clean.ingest";
import { save_mongodb_offers } from "../db.ingestion";
import { Job } from "bullmq";
import { initLogger } from "../../config/logger.config";
import { CRAWLER_ORIGIN } from "../../utils/enum";

const logger = initLogger(CRAWLER_ORIGIN.FRANCE_TRAVAIL);

export const franceTravailIngest = async (job: Job) => {
    try {
        const { data_ingestion } = job.data;
        const cleanedDataArray = await Promise.all(
            data_ingestion.map((data: any) => clean_france_travail_data(data))
        );

//        logger.info(`Cleaned data: ${JSON.stringify(cleanedDataArray, null, 2)}`);

        await save_mongodb_offers(cleanedDataArray);

        logger.info('France Travail data ingested successfully!');
    } catch (error) {
        logger.error('Failed to ingest France Travail data:', error);
    }
};
