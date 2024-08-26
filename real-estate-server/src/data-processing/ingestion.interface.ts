import { Job } from "bull";
import { AdDocument } from "src/models/ad.schema";

export interface IngestionInterface {
    ingest(job: Job): Promise<void>;
    clean_data(data: any): Promise<Partial<AdDocument>>;
    process_data(data: Partial<AdDocument>): Promise<void>;
}