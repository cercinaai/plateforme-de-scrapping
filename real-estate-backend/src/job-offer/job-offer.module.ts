import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { JobOfferController } from "./job-offer.controller";
import { JobOfferService } from "./job-offer.service";
import { JobOffers, JobOffersSchema } from "../models/JobOffers.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: JobOffers.name, schema: JobOffersSchema },
    ]),
  ],
  controllers: [JobOfferController],
  providers: [JobOfferService],
})
export class JobOfferModule {}
