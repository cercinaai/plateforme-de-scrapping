import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JobOfferController } from './job-offer.controller';
import { JobOfferService } from './job-offer.service';
import { OpenAIService } from './open-ai.service';
import { JobOffers, JobOffersSchema } from '../models/JobOffers.schema';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: JobOffers.name, schema: JobOffersSchema }]),
    ConfigModule,
  ],
  controllers: [JobOfferController],
  providers: [JobOfferService, OpenAIService],
  exports: [JobOfferService],
})
export class JobOfferModule {}
