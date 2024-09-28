import { Job } from "bullmq";
import { save_mongodb } from "../db.ingestion";
import { clean_boncoin_data } from "./boncoin-clean.ingest";
import { boncoin_preprocess_data } from "./boncoin-preprocess.ingest";
import { initLogger } from "../../config/logger.config";
import { CRAWLER_ORIGIN } from "../../utils/enum";

const logger = initLogger(CRAWLER_ORIGIN.BONCOIN);

export const boncoinIngest = async (job: Job) => {
    try {
        const { data_ingestion } = job.data;
        const cleaned_data = await clean_boncoin_data(data_ingestion);
        const processed_data = await boncoin_preprocess_data(cleaned_data);
        await save_mongodb(processed_data);
        logger.info('Ingest data successfully!');
    } catch (error) {
        logger.error('Ingest data failed.', error);
    }
}


