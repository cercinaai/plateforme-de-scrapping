import { Job } from "bullmq";
import { clean_bienici_data } from "./bienici-clean.ingest";
import { bienici_preprocess_data } from "./bienici-preprocess.ingest";
import { initLogger } from '../../config/logger.config';
import { CRAWLER_ORIGIN } from "../../utils/enum";
import { save_mongodb } from "../db.ingestion";

const logger = initLogger(CRAWLER_ORIGIN.BIENICI);

export const bieniciIngest = async (job: Job) => {
    try {
        const { data_ingestion } = job.data;
        const cleaned_data = await clean_bienici_data(data_ingestion);
        const processed_data = await bienici_preprocess_data(cleaned_data);
        await save_mongodb([processed_data]);
        logger.info('Ingest data successfully!');
    } catch (error) {
        logger.error('Ingest data failed.', error);
    }
}
