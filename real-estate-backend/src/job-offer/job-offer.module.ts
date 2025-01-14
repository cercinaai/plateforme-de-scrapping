import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JobOfferController } from './job-offer.controller';
import { JobOfferService } from './job-offer.service';
import { OpenAIService } from './open-ai.service';
import { JobOffers, JobOffersSchema } from '../models/JobOffers.schema';
import { ConfigModule } from '@nestjs/config';
import { JobOfferEntity } from '../models/job-offers.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EntrepriseEntity } from '../models/entreprise.entity';
import { HunterData, HunterDataSchema } from 'src/models/EmailsHunter.schema';
import { AnymailData,AnymailDataSchema } from 'src/models/anymailDataModel.schema';
@Module({
  imports: [
    MongooseModule.forFeature([{ name: JobOffers.name, schema: JobOffersSchema }]),
    MongooseModule.forFeature([{ name: HunterData.name, schema: HunterDataSchema }]),
    ConfigModule,
    TypeOrmModule.forFeature([JobOfferEntity]), 
    TypeOrmModule.forFeature([EntrepriseEntity]),
    MongooseModule.forFeature([{ name: AnymailData.name, schema: AnymailDataSchema }]),

  ],
  controllers: [JobOfferController],
  providers: [JobOfferService, OpenAIService],
  exports: [JobOfferService],
})
export class JobOfferModule {}
