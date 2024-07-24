import { BrowserName, DeviceCategory, OperatingSystemsName, PlaywrightCrawler, ProxyConfiguration } from 'crawlee';
import { boncoin_router } from './boncoin.router';
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Scope } from '@nestjs/common';

@Processor({ name: 'crawler', scope: Scope.REQUEST })
export class BoncoinCrawler {

    @Process('boncoin-crawler')
    async start(job: Job) {
        let crawler = new PlaywrightCrawler({
            useSessionPool: true,
            persistCookiesPerSession: true,
            maxRequestRetries: 3,
            maxSessionRotations: 3,
            retryOnBlocked: true,
            sameDomainDelaySecs: 0,
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
            errorHandler: async ({ crawler }, error) => {
                // PROXY MANAGEMENT TO BE IMPLEMENTED
                // crawler.proxyConfiguration = new ProxyConfiguration({})
            },
            failedRequestHandler: async ({ request, proxyInfo, crawler }, error) => {
                await job.moveToFailed(error);
                let crawler_stat = crawler.stats.state;
                await job.update({
                    job_id: job.id.toLocaleString(),
                    error_date: new Date(),
                    crawler_origin: 'boncoin',
                    status: 'failed',
                    failedReason: error.message,
                    failed_request_url: request.url,
                    success_requests: crawler_stat.requestsFinished,
                    failed_requests: crawler_stat.requestsFailed,
                    proxy_used: proxyInfo.url
                });
            },
        });
        await crawler.run(['https://www.leboncoin.fr/recherche?category=9&owner_type=pro']);
        if (!crawler.requestQueue.isEmpty()) {
            await crawler.requestQueue.drop();
        }
        await crawler.teardown();
        if (job.isFailed()) return;
        await job.update({
            success_date: new Date(),
            crawler_origin: 'boncoin',
            status: 'success',
            success_requests: crawler.stats.state.requestsFinished,
            failed_requests: crawler.stats.state.requestsFailed
        });
        await job.moveToCompleted("success");
    }
}