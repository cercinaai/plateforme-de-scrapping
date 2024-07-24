import { crawler_healthCheck_negative, crawler_healthCheck_positive } from "./crawler.type";


export interface crawlerInterface {
    config_crawler(): void;
    crawler_healthCheck(): crawler_healthCheck_positive | crawler_healthCheck_negative;
    start_crawler(): Promise<void>;
} 