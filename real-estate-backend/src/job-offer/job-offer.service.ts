import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { JobOffers, JobOffersDocument } from "../models/JobOffers.schema";

@Injectable()
export class JobOfferService {
  constructor(
    @InjectModel(JobOffers.name) private jobOfferModel: Model<JobOffersDocument>
  ) {}

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
}
