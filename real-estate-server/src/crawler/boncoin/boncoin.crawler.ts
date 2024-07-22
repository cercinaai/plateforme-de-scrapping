import { BrowserName, DeviceCategory, OperatingSystemsName, PlaywrightCrawler, ProxyConfiguration } from 'crawlee';
import { crawlerInterface } from '../utils/crawler.interface';
import { crawler_healthCheck_negative, crawler_healthCheck_positive } from '../utils/crawler.type';
import { boncoin_router } from './boncoin.router';




export class BoncoinCrawler implements crawlerInterface {

    private crawler: PlaywrightCrawler;
    private crawler_status: crawler_healthCheck_positive | crawler_healthCheck_negative;

    constructor() {
        this.config_crawler();
    }

    config_crawler() {
        this.crawler = new PlaywrightCrawler({
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
            postNavigationHooks: [
                async ({ request }) => {
                    this.crawler_status = {
                        crawler_origin: 'boncoin',
                        last_checked: new Date(),
                        request_url: request.url,
                    }
                }
            ],
            failedRequestHandler: async ({ request }) => {
                this.crawler_status = {
                    error_date: new Date(),
                    crawler_origin: 'boncoin',
                    crawler_error: request.errorMessages,
                    request_url: request.url,
                }
            },
        })
    }

    async start_crawler(): Promise<void> {
        await this.crawler.run(['https://www.leboncoin.fr/recherche?category=9&owner_type=pro'])
    }

    crawler_healthCheck(): crawler_healthCheck_positive | crawler_healthCheck_negative {
        return this.crawler_status
    }
}