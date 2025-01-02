import { Body, Controller, Get, Post, HttpException, HttpStatus } from "@nestjs/common";
import { JobOfferService } from "./job-offer.service";

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
}
