import { Queue, Worker } from "bullmq";
import { CRAWLER_ORIGIN } from "../utils/enum";
import { initRedis } from '../config/redis.config';
import { selogerIngest } from "./seloger-ingest/seloger.ingest";
import { boncoinIngest } from "./boncoin-ingest/boncoin.ingest";
import { bieniciIngest } from "./bienici-ingest/bienici.ingest";
import { logicimmoIngest } from "./logicimmo-ingest/logicimmo.ingest";

const ingestion_queue = new Queue('data-ingestion', initRedis());

new Worker(ingestion_queue.name, async (job) => {
    if (job.name === CRAWLER_ORIGIN.BONCOIN) return boncoinIngest(job);
    if (job.name === CRAWLER_ORIGIN.SELOGER) return selogerIngest(job);
    if (job.name === CRAWLER_ORIGIN.BIENICI) return bieniciIngest(job);
    if (job.name === CRAWLER_ORIGIN.LOGICIMMO) return logicimmoIngest(job);
}, { ...initRedis(), concurrency: 20 });


export const ingestData = async (data_ingestion: any, origin: CRAWLER_ORIGIN) => {
    await ingestion_queue.add(origin, { data_ingestion }, { removeOnComplete: true, removeOnFail: true });
}