import { Test, TestingModule } from '@nestjs/testing';
import { LogicImmoCrawler } from './logicimmo.crawler';
import { DataProcessingService } from '../../data-processing/data-processing.service';
import { Job } from 'bull';
import { PlaywrightCrawler } from 'crawlee';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Ad } from '../../models/ad.schema';

jest.mock('crawlee');

describe('LogicImmoCrawler', () => {
    let crawler: LogicImmoCrawler;
    let dataProcessingService: DataProcessingService;
    let adModel: Model<Ad>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                LogicImmoCrawler,
                {
                    provide: DataProcessingService,
                    useValue: { process: jest.fn() },
                },
                {
                    provide: getModelToken(Ad.name),
                    useValue: { find: jest.fn(), countDocuments: jest.fn() },
                },
            ],
        }).compile();

        crawler = module.get<LogicImmoCrawler>(LogicImmoCrawler);
        dataProcessingService = module.get<DataProcessingService>(DataProcessingService);
        adModel = module.get<Model<Ad>>(getModelToken(Ad.name));
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

    it('should stop the crawler if ads are already in the database', async () => {
        const job: Job = { data: {} } as Job;
        jest.spyOn(adModel, 'find').mockResolvedValue([{ adId: '123' }]);

        const stopCrawlerSpy = jest.spyOn(crawler as any, 'stopCrawler').mockResolvedValue(true);

        await crawler.start(job);

        expect(stopCrawlerSpy).toHaveBeenCalled();
    });

    it('should handle pagination correctly', async () => {
        const handlePaginationSpy = jest.spyOn(crawler as any, 'handlePagination').mockResolvedValue(false);
        const job: Job = { data: {} } as Job;

        await crawler.start(job);

        expect(handlePaginationSpy).toHaveBeenCalled();
    });
});
