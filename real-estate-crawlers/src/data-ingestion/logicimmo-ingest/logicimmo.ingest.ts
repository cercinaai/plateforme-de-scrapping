import { Job } from "bullmq";
import { clean_logicimmo_data } from "./logicimmo-clean.ingest";
import { logicimmo_preprocess_data } from "./logicimmo-preprocess.ingest";
import { save_mongodb } from "../db.ingestion";
import { initLogger } from "../../config/logger.config";
import { CRAWLER_ORIGIN } from "../../utils/enum";

const logger = initLogger(CRAWLER_ORIGIN.LOGICIMMO);

export const logicimmoIngest = async (job: Job) => {
    try {
        const { data_ingestion } = job.data;
        const cleaned_data = await clean_logicimmo_data(data_ingestion);
        const processed_data = await logicimmo_preprocess_data(cleaned_data);
        await save_mongodb([processed_data]);
        logger.info('Ingest data successfully!');
    } catch (error) {
        logger.error('Ingest data failed.', error);
    }
}