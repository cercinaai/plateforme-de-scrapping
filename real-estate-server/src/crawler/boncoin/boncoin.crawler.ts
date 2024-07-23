import { BrowserName, DeviceCategory, OperatingSystemsName, PlaywrightCrawler, ProxyConfiguration } from 'crawlee';
import { boncoin_router } from './boncoin.router';
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';


@Processor('crawler')
export class BoncoinCrawler {

    @Process('boncoin-crawler')
    async start_crawler(job: Job): Promise<void> {
        let crawler = new PlaywrightCrawler({
            useSessionPool: true,
            persistCookiesPerSession: true,
            headless: true,
            retryOnBlocked: true,
            maxRequestRetries: 3,
            requestHandler: boncoin_router,
            browserPoolOptions: {
                useFingerprints: true,
                fingerprintOptions: {
                    fingerprintGeneratorOptions: {
                        browsers: [{
                            name: BrowserName.chrome,
                            minVersion: 96,
                        }],
                        devices: [
                            DeviceCategory.desktop,
                        ],
                        operatingSystems: [
                            OperatingSystemsName.windows,
                        ],
                    },
                },
            },
            postNavigationHooks: [],
            failedRequestHandler: async (_, error: Error) => {
                job.moveToFailed({ message: error.message })
            },
        });
        await crawler.run(['https://www.leboncoin.fr/recherche?category=9&owner_type=pro'])
    }
}