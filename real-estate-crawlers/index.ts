import { CronJob } from 'cron';
import { initMongoDB } from "./src/config/mongodb.config";
import { start_crawlers, start_crawlers_revision } from './src/crawlers/crawlers.queue';
import { handleQueueUnexpectedError } from './src/utils/handleCrawlerState.util';
import { config } from 'dotenv';
import { generateDefaultCrawlersConfig, getCrawlersConfig } from './src/config/crawlers.config';


// LOADS ENVIRONMENT VARIABLES
config({ path: `./environments/${process.env.NODE_ENV}.env` })


// INITIALIZE MONGODB
await initMongoDB();

// CONFIGURATE CRAWLERS
await generateDefaultCrawlersConfig();

console.log(new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }));

await start_crawlers();

// // INITIALIZE CRAWLERS
const start_crawlers_every_midnight = new CronJob(
    '0 0 * * *', 
    async () => {
        console.log(`[${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}] Starting midnight scraping job...`);
        try {
            await start_crawlers();
            console.log("Midnight scraping job completed successfully.");
        } catch (error) {
            console.error("Error during midnight scraping job:", error);
        }
    },
    null,
    false, // Ensure it starts manually
    'Europe/Paris'
);
const start_crawlers_monthly_revision = new CronJob('0 0 1 * *', async () => await start_crawlers_revision(), null, false, 'Europe/Paris');

const start_crawlers_at_10_17_am = new CronJob(
    '55 10 * * *', // Exécution à 10h17
    async () => {
        console.log("Starting scraping job...");
        try {
            await start_crawlers();
            console.log("Scraping job completed successfully.");
        } catch (error) {
            console.error("Error during scraping job:", error);
        }
    },
    null,
    true, 
    'Europe/Paris'
);


// // // SCHEDULE CRAWLERS
start_crawlers_every_midnight.start();
start_crawlers_monthly_revision.start();
start_crawlers_at_10_17_am.start();


// LISTEN FOR UNEXPECTED ERRORS
process.on('unhandledRejection', async (err) => handleQueueUnexpectedError('unhandledRejection', err));
process.on('uncaughtException', async (err) => handleQueueUnexpectedError('uncaughtException', err));

// CREATE SERVER AND START SERVER
const port = 3002;
const http = await import('http');
const server = http.createServer();


server.on('request', async (req, res) => {
    const { api_key } = await getCrawlersConfig();
    if (req.method === 'GET' && req.url === '/populate-database' && req.headers['x-api-key'] === api_key) {
        await start_crawlers();
        res.end('Database populated.');
    } else {
        res.statusCode = 404;
        res.end('Not Found');
    }
})
server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
