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


@Module({
  imports: [
    MongooseModule.forFeature([{ name: JobOffers.name, schema: JobOffersSchema }]),
    ConfigModule,
    TypeOrmModule.forFeature([JobOfferEntity]), 
    TypeOrmModule.forFeature([EntrepriseEntity]),
  ],
  controllers: [JobOfferController],
  providers: [JobOfferService, OpenAIService],
  exports: [JobOfferService],
})
export class JobOfferModule {}
