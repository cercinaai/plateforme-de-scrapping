import { Test, TestingModule } from '@nestjs/testing';
import { BieniciCrawler } from './bienici.crawler';
import { DataProcessingService } from '../../data-processing/data-processing.service';
import { Job } from 'bull';
import { PlaywrightCrawler } from 'crawlee';

jest.mock('crawlee');

describe('BieniciCrawler', () => {
    let crawler: BieniciCrawler;
    let dataProcessingService: DataProcessingService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                BieniciCrawler,
                {
                    provide: DataProcessingService,
                    useValue: { process: jest.fn() },
                },
            ],
        }).compile();

        crawler = module.get<BieniciCrawler>(BieniciCrawler);
        dataProcessingService = module.get<DataProcessingService>(DataProcessingService);
    });

    it('should be defined', () => {
        expect(crawler).toBeDefined();
    });

    it('should start the crawler and process ads', async () => {
        const job: Job = { data: {} } as Job;
        const mockCrawlerRun = jest.fn().mockResolvedValue({
            requestsFailed: 0,
            requestsTotal: 10,
            requestsFinished: 10,
        });

        (PlaywrightCrawler as unknown as jest.Mock).mockImplementation(() => ({
            run: mockCrawlerRun,
            teardown: jest.fn(),
        }));

        await crawler.start(job);

        expect(mockCrawlerRun).toHaveBeenCalled();
        expect(dataProcessingService.process).toHaveBeenCalled();
    });

    it('should handle crawler failures', async () => {
        const job: Job = { data: {} } as Job;
        const mockCrawlerRun = jest.fn().mockResolvedValue({
            requestsFailed: 1,
            requestsTotal: 10,
            requestsFinished: 9,
        });

        (PlaywrightCrawler as unknown as jest.Mock).mockImplementation(() => ({
            run: mockCrawlerRun,
            teardown: jest.fn(),
        }));

        const moveToFailedSpy = jest.spyOn(job, 'moveToFailed').mockResolvedValue(null);

        await crawler.start(job);

        expect(moveToFailedSpy).toHaveBeenCalledWith(expect.any(Error), false);
    });

    it('should call formatAds correctly', async () => {
        const formatAdsSpy = jest.spyOn(crawler as any, 'format_ads').mockResolvedValue([]);
        const job: Job = { data: {} } as Job;

        await crawler.start(job);

        expect(formatAdsSpy).toHaveBeenCalled();
    });
});
