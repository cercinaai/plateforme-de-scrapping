import { CronJob } from 'cron';
import { initMongoDB } from "./src/config/mongodb.config";
import { config } from 'dotenv';
import { start_crawlers, start_crawlers_revision } from './src/crawlers/crawlers.queue';

// INITIALIZE ENVIRONMENT
config();


// INITIALIZE MONGODB
// await initMongoDB();

// INITIALIZE CRAWLERS
await start_crawlers()
// const start_crawlers_every_midnight = new CronJob('0 0 * * *', async () => await start_crawlers(), null, false, 'Europe/Paris');
// const start_crawlers_monthly_revision = new CronJob('0 0 1 * *', async () => await start_crawlers_revision(), null, false, 'Europe/Paris');

// // SCHEDULE CRAWLERS
// start_crawlers_every_midnight.start();
// start_crawlers_monthly_revision.start();

