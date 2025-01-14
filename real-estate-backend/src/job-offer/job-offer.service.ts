import { Injectable, OnModuleInit } from '@nestjs/common';
import axios from 'axios';
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { JobOffers, JobOffersDocument } from "../models/JobOffers.schema";
import { OpenAIService } from './open-ai.service';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { JobOfferEntity } from '../models/job-offers.entity';
import { EntrepriseEntity } from '../models/entreprise.entity';
import { HunterData, HunterDataDocument } from "../models/EmailsHunter.schema";

@Injectable()
export class JobOfferService {
  constructor(
    @InjectModel(JobOffers.name) private jobOfferModel: Model<JobOffersDocument>,
    private openAIService: OpenAIService,
    @InjectRepository(JobOfferEntity)
    private jobOfferRepository: Repository<JobOfferEntity>,
    @InjectRepository(EntrepriseEntity) private entrepriseRepository: Repository<EntrepriseEntity>,
    @InjectModel(HunterData.name) private hunterDataModel: Model<HunterDataDocument>

  ) {}

 
  
  async onModuleInit() {
    console.log('JobOfferService initialized. Starting job offer processing...');
    // setTimeout(() => {
    //   this.processAllJobOffers().catch(error => {
    //     console.error('Failed to process job offers on startup:', error);
    //   });
    // }, 0);
  }


  
  async processAllJobOffers() {
    console.log('Fetching all job offers from the database...');
    const jobOffers = await this.jobOfferModel.find().exec(); 
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

  async processSingleJobOffer(jobOffer: JobOffers): Promise<Partial<JobOffers>> {
    try {
      const updatedFields = await this.openAIService.processJobOffer(jobOffer);
      await this.jobOfferModel.findByIdAndUpdate(jobOffer._id, updatedFields).exec();
      return updatedFields;
    } catch (error) {
      console.error('Failed to process single job offer:', error);
      throw new Error('Error processing the job offer.');
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


  async findOffersWithCompanyName(): Promise<{ companyName: string }[]> {
    try {
        // Recherche des offres avec un nom d'entreprise non nul
        const offers = await this.jobOfferModel
            .find({ 'company.name': { $ne: null } }) // Filtrer sur les noms d'entreprise non nuls
            .limit(100) // Limiter à 100 résultats
            .select('company.name') // Sélectionner uniquement le champ `company.name`
            .exec();

        // Mapper les résultats pour ne retourner que le nom de l'entreprise
        return offers.map(offer => ({ companyName: offer.company?.name || '' }));
    } catch (error) {
        console.error('Error fetching job offers with company name:', error);
        throw new Error('Failed to fetch job offers with company name.');
    }
}

async migrateJobOffersFromMongoToMySQL() {
  try {
    const mongoJobOffers = await this.jobOfferModel.find().exec();

    for (const mongoOffer of mongoJobOffers) {
      if (!mongoOffer.company?.name) {
        console.warn('Skipping job offer due to missing company name:', mongoOffer);
        continue;
      }

      // Construire une liste d'emails
      const emailList = Array.isArray(mongoOffer.company?.email)
        ? mongoOffer.company.email
        : [mongoOffer.company?.email].filter(Boolean);

      // Vérifier ou créer l'entreprise
      let entreprise = await this.entrepriseRepository.findOne({
        where: { nom: mongoOffer.company?.name },
      });

      if (!entreprise) {
        entreprise = await this.entrepriseRepository.save(
          this.entrepriseRepository.create({
            nom: mongoOffer.company?.name,
            email: emailList,
          }),
        );
      }

      // Vérifier si l'offre d'emploi existe déjà
      const existingJobOffer = await this.jobOfferRepository.findOne({
        where: { titre: mongoOffer.title, entreprise: { id: entreprise.id } },
      });

      if (existingJobOffer) {
        console.log(`Job offer already exists: ${mongoOffer.title}`);
        continue; // Passer à la prochaine offre
      }

      // Préparer les champs
      const competences = mongoOffer.competences?.join(', ') || null;
      const savoirEtre = mongoOffer.savoirEtre?.join(', ') || null;
      const formation = mongoOffer.formation?.join(', ') || null;
      const specialite = mongoOffer.specialties?.join(', ') || null;

      const jobOfferEntity = this.jobOfferRepository.create({
        titre: mongoOffer.title,
        description: mongoOffer.description,
        localisation: mongoOffer.location,
        type_de_contrat: ['CDI', 'CDD', 'intérim', 'saisonnier', 'stage', 'autres'].includes(mongoOffer.contract)
          ? mongoOffer.contract
          : 'autres',
        salaire_brut: ['salaire précis', 'fourchette salariale', 'non précisé'].includes(mongoOffer.salary)
          ? mongoOffer.salary
          : 'non précisé',
        competences,
        savoir_etre: savoirEtre,
        specialite,
        occupation: ['Full-time', 'flexible', 'Part-time'].includes(mongoOffer.workHours)
          ? mongoOffer.workHours
          : 'Full-time',
        experience: ['sans experience', '1 à 3 ans', '3 à 5 ans', '5 à 10 ans', 'plus de 10 ans'].includes(mongoOffer.experience)
          ? mongoOffer.experience
          : 'sans experience',
        formation,
        qualite_pro: ['technicien', 'cadre de santé', 'auxiliaire médical'].includes(mongoOffer.qualification)
          ? mongoOffer.qualification
          : 'technicien',
        secteur_activite: ['soins hospitaliers', 'maison de retraite', 'clinique privée', 'soins à domicile'].includes(mongoOffer.industry)
          ? mongoOffer.industry
          : 'soins hospitaliers',
        duree_de_l_offre: 'jusqu’à fermeture',
        entreprise,
      });

      await this.jobOfferRepository.save(jobOfferEntity);
      console.log(`Job offer saved: ${jobOfferEntity.titre}`);
    }

    console.log('Migration completed!');
  } catch (error) {
    console.error('Error migrating job offers:', error);
    throw new Error('Migration failed');
  }
}






//return number of job offer in mysql 
async countJobOffers(): Promise<number> {
  try {
    console.log('Starting count of job offers...');
    const count = await this.jobOfferRepository.count();
    console.log('Count successful:', count);
    return count;
  } catch (error) {
    console.error('Error counting job offers:', error);
    throw new Error('Failed to count job offers');
  }
}

// retun number of entreprise 
async countEntreprises(): Promise<number> {
  try {
    console.log('Starting count of entreprises...');
    const count = await this.entrepriseRepository.count();
    console.log('Count successful:', count);
    return count;
  } catch (error) {
    console.error('Error counting entreprises:', error);
    throw new Error('Failed to count entreprises');
  }
}


async fetchAndEnrichJobOffers(): Promise<void> {
  try {
    // Récupérer les 200 nouvelles offres triées par date de publication
    const jobOffers = await this.jobOfferModel
      .find()
      .sort({ publicationDate: -1 })
      .limit(200)
      .exec();

      //console afficher le nombre des offer collecte
    console.log(`Fetched ${jobOffers.length} job offers for enrichment.`);

    const processedCompanies = new Set<string>();

    for (const offer of jobOffers) {
      const companyName = offer.company?.name;

      if (companyName && !processedCompanies.has(companyName)) {
        processedCompanies.add(companyName);

        // Vérifier si la société existe déjà dans HunterData
        const existingData = await this.hunterDataModel.findOne({ organization: companyName }).exec();

        if (!existingData) {
          try {
            // Appeler l'API Hunter pour récupérer les données
            const response = await axios.get(
              `https://api.hunter.io/v2/domain-search?company=${encodeURIComponent(companyName)}&api_key=b0c3bfce9118edbbda084927b82b238132e238e0`
            );

            const hunterData = response.data?.data;

            if (hunterData) {
              // Créer un document HunterData
              const newHunterData = new this.hunterDataModel({
                domain: hunterData.domain,
                disposable: hunterData.disposable,
                webmail: hunterData.webmail,
                accept_all: hunterData.accept_all,
                pattern: hunterData.pattern,
                organization: hunterData.organization,
                description: hunterData.description,
                industry: hunterData.industry,
                twitter: hunterData.twitter,
                facebook: hunterData.facebook,
                linkedin: hunterData.linkedin,
                instagram: hunterData.instagram,
                youtube: hunterData.youtube,
                technologies: hunterData.technologies,
                country: hunterData.country,
                state: hunterData.state,
                city: hunterData.city,
                postal_code: hunterData.postal_code,
                street: hunterData.street,
                headcount: hunterData.headcount,
                company_type: hunterData.company_type,
                emails: hunterData.emails?.map(email => ({
                  value: email.value,
                  type: email.type,
                  confidence: email.confidence,
                  first_name: email.first_name,
                  last_name: email.last_name,
                  position: email.position,
                  seniority: email.seniority,
                  department: email.department,
                  linkedin: email.linkedin,
                  twitter: email.twitter,
                  phone_number: email.phone_number,
                  verification_status: email.verification?.status,
                  verification_date: email.verification?.date,
                })),
                linked_domains: hunterData.linked_domains,
              });

              await newHunterData.save();
              console.log(`Hunter data saved for company: ${companyName}`);
            }
          } catch (error) {
            console.error(`Failed to fetch Hunter data for company: ${companyName}`, error);
          }
        } else {
          console.log(`Hunter data already exists for company: ${companyName}`);
        }
      }
    }

    console.log('Job offers enrichment completed.');
  } catch (error) {
    console.error('Error enriching job offers with Hunter data:', error);
    throw new Error('Failed to enrich job offers with Hunter data.');
  }
}
async fetchCompaniesAndEmails(): Promise<{ organization: string, emails: string[] }[]> {
  try {
    const hunterData = await this.hunterDataModel.find().exec();

    return hunterData.map(data => ({
      organization: data.organization,
      emails: data.emails.map(email => email.value),
    }));
  } catch (error) {
    console.error('Error fetching companies and emails:', error);
    throw new Error('Failed to fetch companies and emails');
  }
}

}
