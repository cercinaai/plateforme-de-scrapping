import { Body, Controller, Param,Get, Post, HttpException, HttpStatus } from "@nestjs/common";
import { JobOfferService } from "./job-offer.service";
import { JobOffers } from "../models/JobOffers.schema";
@Controller("job-offers")
export class JobOfferController {
  constructor(private readonly jobOfferService: JobOfferService) {}


  @Get('companies-and-emails')
  async getCompaniesAndEmails() {
    try {
      return await this.jobOfferService.fetchCompaniesAndEmails();
    } catch (error) {
      throw new HttpException(
        'Failed to fetch companies and emails',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  
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

  @Get('count')
async countJobOffers() {
  try {
    console.log('Fetching job offer count...');
    const count = await this.jobOfferService.countJobOffers();
    console.log('Job offer count fetched:', count);
    return { count };
  } catch (error) {
    console.error('Error in countJobOffers API:', error);
    throw new HttpException(
      `Failed to count job offers: ${error.message}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
@Get('countEntreprises')
async countEntreprises() {
  try {
    console.log('Fetching entreprise count...');
    const count = await this.jobOfferService.countEntreprises();
    console.log('Entreprise count fetched:', count);
    return { count };
  } catch (error) {
    console.error('Error in countEntreprises API:', error);
    throw new HttpException(
      `Failed to count entreprises: ${error.message}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
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


@Post('migrate')
async migrateJobOffers() {
  try {
    await this.jobOfferService.migrateJobOffersFromMongoToMySQL();
    return { message: 'Job offers migrated successfully!' };
  } catch (error) {
    throw new HttpException(
      `Failed to migrate job offers: ${error.message}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

@Post('fetch-enrich')
async fetchAndEnrichJobOffers() {
  try {
    await this.jobOfferService.fetchAndEnrichJobOffers();
    return { message: 'Job offers enriched successfully!' };
  } catch (error) {
    console.error('Error in fetchAndEnrichJobOffers API:', error);
    throw new HttpException(
      `Failed to enrich job offers: ${error.message}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

@Get('enrich-entreprises-emails')
async enrichEntreprisesWithEmails() {
  try {
    await this.jobOfferService.enrichEntreprisesWithEmails();
    return { message: 'Entreprises enriched with emails successfully!' };
  } catch (error) {
    console.error('Error in enrichEntreprisesWithEmails API:', error);
    throw new HttpException(
      'Failed to enrich entreprises with emails',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}




}
