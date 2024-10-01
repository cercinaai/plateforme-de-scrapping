import { CronJob } from 'cron';
import { initMongoDB } from "./src/config/mongodb.config";
import { start_crawlers, start_crawlers_revision } from './src/crawlers/crawlers.queue';
import { handleQueueUnexpectedError } from './src/utils/handleCrawlerState.util';
import { config } from 'dotenv';


// LOADS ENVIRONMENT VARIABLES
config({ path: `./environments/${process.env.NODE_ENV}.env` })


// INITIALIZE MONGODB
await initMongoDB();

// INITIALIZE CRAWLERS
const start_crawlers_every_midnight = new CronJob('0 0 * * *', async () => await start_crawlers(), null, false, 'Europe/Paris');
const start_crawlers_monthly_revision = new CronJob('0 0 1 * *', async () => await start_crawlers_revision(), null, false, 'Europe/Paris');

// // SCHEDULE CRAWLERS
start_crawlers_every_midnight.start();
start_crawlers_monthly_revision.start();


// LISTEN FOR UNEXPECTED ERRORS
process.on('unhandledRejection', async (err) => handleQueueUnexpectedError('unhandledRejection', err));
process.on('uncaughtException', async (err) => handleQueueUnexpectedError('uncaughtException', err));