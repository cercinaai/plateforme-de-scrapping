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

//console.log(new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }));

//await start_crawlers();

// // INITIALIZE CRAWLERS
// const start_crawlers_every_midnight = new CronJob(
//     '0 0 * * *', 
//     async () => {
//         console.log(`[${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}] Starting midnight scraping job...`);
//         try {
//             await start_crawlers();
//             console.log("Midnight scraping job completed successfully.");
//         } catch (error) {
//             console.error("Error during midnight scraping job:", error);
//         }
//     },
//     null,
//     false, // Ensure it starts manually
//     'Europe/Paris'
// );
// const start_crawlers_monthly_revision = new CronJob('0 0 1 * *', async () => await start_crawlers_revision(), null, false, 'Europe/Paris');

// console.log(`[${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}] Initializing cron job for 11:00 AM...`);

// const start_crawlers_at_11_am = new CronJob(
//     '5 11 * * *', 
//     async () => {
//         console.log(`[${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}] Starting scraping job at 11:00 AM...`);
//         try {
//             await start_crawlers();
//             console.log("Scraping job at 11:00 AM completed successfully.");
//         } catch (error) {
//             console.error("Error during scraping job at 11:00 AM:", error);
//         }
//     },
//     null,
//     true,
//     'Europe/Paris'
// );

// console.log(`[${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}] Cron job for 11:00 AM initialized.`);



// // // // SCHEDULE CRAWLERS
// start_crawlers_every_midnight.start();
// start_crawlers_monthly_revision.start();
// start_crawlers_at_10_17_am.start();
const runAtSpecificTime = async (hour: number, minute: number, callback: Function) => {
    const now = new Date();
    const nextRun = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        hour,
        minute,
        0,
        0
    );

    if (now > nextRun) {
        // If the time has already passed for today, schedule for tomorrow
        nextRun.setDate(nextRun.getDate() + 1);
    }

    const delay = nextRun.getTime() - now.getTime();
    console.log(`Next run scheduled in ${delay / 1000 / 60} minutes.`);

    setTimeout(async () => {
        await callback();
        // Schedule the next run
        runAtSpecificTime(hour, minute, callback);
    }, delay);
};

// Schedule `start_crawlers` to run at midnight (00:00)
runAtSpecificTime(11, 40, async () => {
    console.log(`[${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}] Starting midnight scraping job...`);
    try {
        await start_crawlers();
        console.log("Midnight scraping job completed successfully.");
    } catch (error) {
        console.error("Error during midnight scraping job:", error);
    }
});


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
