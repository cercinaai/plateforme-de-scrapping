import { Test } from '@nestjs/testing';
import { BieniciCrawler } from './bienici.crawler';
import { DataProcessingService } from './../../data-processing/data-processing.service';
import { Job } from 'bull';
import { Configuration, createPlaywrightRouter, Dictionary, LogLevel, PlaywrightCrawler, PlaywrightCrawlingContext, RouterHandler } from 'crawlee';
import { bieniciCrawlerOption } from '../../config/playwright.config';
import { HttpModule, HttpService } from '@nestjs/axios';

class BieniciCrawlerTest extends BieniciCrawler {
    constructor(dataProcessingService: DataProcessingService, protected readonly httpService: HttpService) {
        super(dataProcessingService, httpService);
    }
    protected override createRequestHandler(): RouterHandler<PlaywrightCrawlingContext<Dictionary>> {
        const router = createPlaywrightRouter();
        router.addDefaultHandler(async (context) => this.listHandler(context));
        router.addHandler('ad-single-url', async (context) => this.handleSingleAd(context));
        return router
    }



    async parse_links(job: Job): Promise<void> {
        const crawler = new PlaywrightCrawler({
            ...bieniciCrawlerOption,
            requestHandler: this.createRequestHandler(),
            preNavigationHooks: [(context) => this.preNavigationHook(context, job)],
            postNavigationHooks: [this.postNavigationHook.bind(this)],
        }, new Configuration({
            logLevel: LogLevel.INFO,
            persistStorage: false,
            storageClientOptions: {
                persistStorage: false,
                writeMetadata: false,
            },
            headless: false,
        }));

        await crawler.run([this.targetUrl]);
        await crawler.teardown();
    }
}


describe('BieniciCrawler', () => {
    let dataProcessingService: DataProcessingService;
    let bieniciCrawler: BieniciCrawlerTest;
    let httpService: HttpService
    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [HttpModule],
            providers: [
                BieniciCrawler,
                {
                    provide: DataProcessingService,
                    useValue: {
                        process: jest.fn()
                    }
                }
            ]
        }).compile();
        dataProcessingService = moduleRef.get<DataProcessingService>(DataProcessingService);
        httpService = moduleRef.get<HttpService>(HttpService)
        bieniciCrawler = new BieniciCrawlerTest(dataProcessingService, httpService);
    })
    it('should parse URL LINKS', async (done) => {
        const job: Partial<Job> = {
            data: {
                total_data_grabbed: 0,
                attempts_count: 0
            },
            moveToFailed: jest.fn(),
            update(d) {
                return new Promise((resolve) => {
                    this.data = d;
                    resolve();
                });
            }
        }
        await bieniciCrawler.parse_links(job as Job);
        done();
    }, 80000);
})

