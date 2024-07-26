import { Process, Processor } from "@nestjs/bull";
import { Scope } from "@nestjs/common";
import { DataProcessingService } from "src/data-processing/data-processing.service";
import { Job } from "bull";
import { PlaywrightCrawler, ProxyConfiguration } from "crawlee";
import { selogerConfig, selogerCrawlerOptions } from "./seloger.config";
import { ProxyService } from "../proxy.service";


@Processor({ name: 'crawler', scope: Scope.REQUEST })
export class SelogerCrawler {


    constructor(private dataProcessingService: DataProcessingService, private prxoxyService: ProxyService) { }

    @Process('seloger-crawler')
    async start(job: Job) {
        let crawler = new PlaywrightCrawler({
            ...selogerCrawlerOptions,
            proxyConfiguration: new ProxyConfiguration({
                newUrlFunction: async () => this.prxoxyService.new_proxy()
            }),
            requestHandler: async ({ waitForSelector, page, enqueueLinks, log }) => {

            },

            failedRequestHandler: async ({ request, proxyInfo, crawler }, error) => {
                await job.moveToFailed(error);
                let crawler_stat = crawler.stats.state;
                await job.update({
                    job_id: job.id.toLocaleString(),
                    error_date: new Date(),
                    crawler_origin: 'seloger',
                    status: 'failed',
                    failedReason: error.message,
                    failed_request_url: request.url,
                    success_requests: crawler_stat.requestsFinished,
                    failed_requests: crawler_stat.requestsFailed,
                    proxy_used: proxyInfo.url
                });
            }
        }, selogerConfig)
    }

}