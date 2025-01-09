import { Body, Controller, Param,Get, Post, HttpException, HttpStatus } from "@nestjs/common";
import { JobOfferService } from "./job-offer.service";
import { JobOffers } from "../models/JobOffers.schema";
@Controller("job-offers")
export class JobOfferController {
  constructor(private readonly jobOfferService: JobOfferService) {}

  @Get()
  async getAllJobOffers() {
    try {
      return await this.jobOfferService.findAll();
    } catch (error) {
      throw new HttpException(
        "Failed to fetch job offers",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post()
  async getFilteredJobOffers(@Body() filters: any) {
    try {
      return await this.jobOfferService.findWithFilters(filters);
    } catch (error) {
      throw new HttpException(
        "Failed to fetch job offers",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get(":id")
  async getJobOfferById(@Param("id") id: string) {
    try {
      const jobOffer = await this.jobOfferService.findById(id);
      if (!jobOffer) {
        throw new HttpException("Job offer not found", HttpStatus.NOT_FOUND);
      }
      return jobOffer;
    } catch (error) {
      throw new HttpException(
        "Failed to fetch job offer",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post("test-ai-processing")
  async testAIProcessing(@Body() jobOffer: JobOffers) {
    try {
      const processedJobOffer = await this.jobOfferService.processAndUpdateJobOffer(jobOffer);
      return processedJobOffer;
    } catch (error) {
      throw new HttpException(
        "Failed to process job offer with AI",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }


  @Post("process-single")
  async processSingleJobOffer(@Body() jobOffer: JobOffers) {
    try {
      const processedJobOffer = await this.jobOfferService.processSingleJobOffer(jobOffer);
      return processedJobOffer;
    } catch (error) {
      throw new HttpException(
        "Failed to process job offer with AI",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('company-names')
async getOffersWithCompanyName() {
    try {
        return await this.jobOfferService.findOffersWithCompanyName();
    } catch (error) {
        throw new HttpException(
            'Failed to fetch job offers with company names',
            HttpStatus.INTERNAL_SERVER_ERROR
        );
    }
}
}
