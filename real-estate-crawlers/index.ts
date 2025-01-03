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


//await start_crawlers();

// // INITIALIZE CRAWLERS
// const start_crawlers_every_midnight = new CronJob('0 0 * * *', async () => await start_crawlers(), null, false, 'Europe/Paris');
// const start_crawlers_monthly_revision = new CronJob('0 0 1 * *', async () => await start_crawlers_revision(), null, false, 'Europe/Paris');

// // // // SCHEDULE CRAWLERS
// start_crawlers_every_midnight.start();
// start_crawlers_monthly_revision.start();

const runAtSpecificTime = async (hour: number, minute: number, callback: Function, timeZone: string = 'Europe/Paris') => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false,
    });

    const [formattedHour, formattedMinute] = formatter.format(now).split(':').map(Number);
    let nextRun = new Date(now);

    // Adjust the next run date based on the time in the specified timezone
    if (formattedHour > hour || (formattedHour === hour && formattedMinute >= minute)) {
        nextRun.setDate(nextRun.getDate() + 1); // Schedule for the next day
    }

    nextRun.setHours(hour, minute, 0, 0);

    const delay = nextRun.getTime() - now.getTime();
    console.log(`[${now.toLocaleString('fr-FR', { timeZone })}] Next run scheduled for ${nextRun.toLocaleString('fr-FR', { timeZone })}, which is in ${Math.round(delay / 1000 / 60)} minutes.`);

    setTimeout(async () => {
        await callback();
        runAtSpecificTime(hour, minute, callback, timeZone); // Schedule the next run
    }, delay);
};


// Schedule `start_crawlers` to run at midnight (00:00)
runAtSpecificTime(23, 0, async () => {
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
