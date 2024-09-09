import { Module } from '@nestjs/common';
import { DataProcessingService } from './data-processing.service';
import { BullModule } from '@nestjs/bull';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { MongooseModule } from '@nestjs/mongoose';
import { Ad, AdSchema } from '../models/ad.schema';
import { BoncoinIngestion } from './ingestion/boncoin.ingestion';
import { HttpModule } from '@nestjs/axios';
import { SelogerIngestion } from './ingestion/seloger.ingestion';
import { BienIciIngestion } from './ingestion/bienici.ingestion';
import { LogicImmoIngestion } from './ingestion/logicimmo.ingestion';
import { FileProcessingService } from './file-processing.service';

@Module({
    imports: [
        BullModule.registerQueue({
            name: 'data-processing',
            prefix: 'data-processing',
            defaultJobOptions: {
                removeOnComplete: 50,
                removeOnFail: 100,
            }
        }),
        BullBoardModule.forFeature({
            name: 'data-processing',
            adapter: BullAdapter,
        }),
        MongooseModule.forFeature([{ name: Ad.name, schema: AdSchema }]),
        HttpModule
    ],
    providers: [DataProcessingService, FileProcessingService, BoncoinIngestion, SelogerIngestion, BienIciIngestion, LogicImmoIngestion],
    exports: [DataProcessingService, FileProcessingService],
})
export class DataProcessingModule { }
