import { Module } from '@nestjs/common';
import { DataProcessingService } from './data-processing.service';
import { BullModule } from '@nestjs/bull';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { MongooseModule } from '@nestjs/mongoose';
import { Ad, AdSchema } from 'src/models/ad.schema';
import { BoncoinIngestion } from './ingestion/boncoin.ingestion';
import { HttpModule } from '@nestjs/axios';
import { SelogerIngestion } from './ingestion/seloger.ingestion';

@Module({
    imports: [
        BullModule.registerQueue({ name: 'data-processing' }),
        BullBoardModule.forFeature({
            name: 'data-processing',
            adapter: BullAdapter,
        }),

        HttpModule
    ],
    providers: [DataProcessingService, BoncoinIngestion, SelogerIngestion],
    exports: [DataProcessingService],
    controllers: [],
})
export class DataProcessingModule { }
