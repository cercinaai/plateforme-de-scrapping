import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { JobOffers, JobOffersDocument } from "../models/JobOffers.schema";
import { OpenAIService } from './open-ai.service';

@Injectable()
export class JobOfferService {
  constructor(
    @InjectModel(JobOffers.name) private jobOfferModel: Model<JobOffersDocument>,
    private openAIService: OpenAIService
  ) {}

 
  
  async onModuleInit() {
    console.log('JobOfferService initialized. Starting job offer processing...');
    await this.deleteOffersWithNullCompanyName();

    setTimeout(() => {
      this.processAllJobOffers().catch(error => {
        console.error('Failed to process job offers on startup:', error);
      });
    }, 0);
  }


  
  async processAllJobOffers() {
    console.log('Fetching all job offers from the database...');
    const jobOffers = await this.jobOfferModel.find().exec(); // Si nécessaire, ajoute un filtre pour limiter les offres.
    console.log(`Found ${jobOffers.length} job offers to process.`);

    for (const jobOffer of jobOffers) {
      try {
        await this.processAndUpdateJobOffer(jobOffer);
      } catch (error) {
        console.error(`Error processing job offer with ID: ${jobOffer._id}`, error);
      }
    }
    console.log('Completed processing all job offers.');
}

async processAndUpdateJobOffer(jobOffer: JobOffers) {
    const updatedFields = await this.openAIService.processJobOffer(jobOffer);
    if (Object.keys(updatedFields).length > 0) {
      await this.jobOfferModel.findByIdAndUpdate(jobOffer._id, updatedFields).exec();
    } else {
      console.log(`No updates were made for job offer with ID: ${jobOffer._id}`);
    }
  }




  async findAll(): Promise<JobOffers[]> {
    return this.jobOfferModel.find().exec();
  }

  async findWithFilters(filters: any): Promise<JobOffers[]> {
    const query: any = {};

    if (filters.keyword) {
      query.title = { $regex: filters.keyword, $options: "i" };
    }
    if (filters.location) {
      query.location = { $regex: filters.location, $options: "i" };
    }
    if (filters.contractType) {
      query.contract = { $regex: filters.contractType, $options: "i" };
    }
    if (filters.workTime) {
      query.workHours = { $regex: filters.workTime, $options: "i" };
    }
    if (filters.experience) {
      query.experience = { $regex: filters.experience, $options: "i" };
    }
    if (filters.qualification) {
      query.qualification = { $regex: filters.qualification, $options: "i" };
    }
    if (filters.specialties && filters.specialties.length > 0) {
      query.description = {
        $regex: filters.specialties.join("|"),
        $options: "i",
      };
    }

    return this.jobOfferModel.find(query).exec();
  }

  async findById(id: string): Promise<JobOffers | null> {
    return this.jobOfferModel.findById(id).exec();
  }


  async deleteOffersWithNullCompanyName(): Promise<void> {
    try {
      const result = await this.jobOfferModel.deleteMany({ 'company.name': null }).exec();
      console.log(`${result.deletedCount} job offers with null company name were deleted.`);
    } catch (error) {
      console.error('Error deleting job offers with null company name:', error);
    }
  }

  
}
