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
import { AnymailData,AnymailDataDocument } from 'src/models/anymailDataModel.schema';
@Injectable()
export class JobOfferService {
  constructor(
    @InjectModel(JobOffers.name) private jobOfferModel: Model<JobOffersDocument>,
    private openAIService: OpenAIService,
    @InjectRepository(JobOfferEntity)
    private jobOfferRepository: Repository<JobOfferEntity>,
    @InjectRepository(EntrepriseEntity) private entrepriseRepository: Repository<EntrepriseEntity>,
    @InjectModel(HunterData.name) private hunterDataModel: Model<HunterDataDocument>,
    @InjectModel(AnymailData.name) private anymailDataModel: Model<AnymailDataDocument>

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
                email: JSON.stringify(emailList), // Sauvegarde des emails sous forme de JSON
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
          const competences = mongoOffer.competences ? JSON.stringify(mongoOffer.competences) : null;
          const savoirEtre = mongoOffer.savoirEtre ? JSON.stringify(mongoOffer.savoirEtre) : null;
          const formation = mongoOffer.formation ? JSON.stringify(mongoOffer.formation) : null;
          const specialite = mongoOffer.specialties ? JSON.stringify(mongoOffer.specialties) : null;
          const salaireBrut = mongoOffer.salary ? JSON.stringify([mongoOffer.salary]) : null;
          const experience = mongoOffer.experience ? JSON.stringify([mongoOffer.experience]) : null;
          const occupation = mongoOffer.workHours ? JSON.stringify([mongoOffer.workHours]) : null;
          const qualitePro = mongoOffer.qualification ? JSON.stringify([mongoOffer.qualification]) : null;
          const secteurActivite = mongoOffer.industry ? JSON.stringify([mongoOffer.industry]) : null;

          // Créer et sauvegarder une nouvelle offre d'emploi
          const jobOfferEntity = this.jobOfferRepository.create({
            titre: mongoOffer.title,
            description: mongoOffer.description,
            localisation: mongoOffer.location,
            type_de_contrat: mongoOffer.contract || null,
            salaire_brut: salaireBrut,
            competences,
            savoir_etre: savoirEtre,
            specialite,
            occupation,
            experience,
            formation,
            qualite_pro: qualitePro,
            secteur_activite: secteurActivite,
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
    const jobOffers = await this.jobOfferModel
      .find()
      .sort({ publicationDate: -1 })
      .limit(200)
      .exec();

    console.log(`Fetched ${jobOffers.length} job offers for enrichment.`);

    const processedCompanies = new Set<string>();
    let companiesFound = 0;
    let emailsFound = 0;

    for (const offer of jobOffers) {
      const companyName = offer.company?.name;

      if (companyName && !processedCompanies.has(companyName)) {
        processedCompanies.add(companyName);
        companiesFound++;

        const existingData = await this.anymailDataModel.findOne({ companyName }).exec();

        if (!existingData) {
          try {
            const response = await axios.post(
              `https://api.anymailfinder.com/v5.0/search/company.json`,
              { company_name: companyName },
              {
                headers: {
                  Authorization: `Bearer yTzIE9FoViEPQfs0mqWCbFnF`,
                  'Content-Type': 'application/json',
                },
              }
            );

            const anymailData = response.data;

            if (anymailData.success) {
              emailsFound += anymailData.results.emails.length;

              const newAnymailData = new this.anymailDataModel({
                companyName: anymailData.input.company_name,
                emails: anymailData.results.emails.map(email => ({
                  address: email,
                  confidence: 1, 
                  type: "unknown", 
                })),
                total_count: anymailData.results.total_count,
                validation: anymailData.results.validation,
              });

              await newAnymailData.save();
              console.log(`Anymail data saved for company: ${companyName}`);
            }
          } catch (error) {
            console.error(`Failed to fetch Anymail data for company: ${companyName}`, error);
          }
        } else {
          console.log(`Anymail data already exists for company: ${companyName}`);
        }
      }
    }

    console.log(`Job offers enrichment completed. Processed ${companiesFound} companies and found emails for ${emailsFound} companies.`);
  } catch (error) {
    console.error('Error enriching job offers with Anymail data:', error);
    throw new Error('Failed to enrich job offers with Anymail data.');
  }
}


async fetchCompaniesAndEmails(): Promise<{ organization: string, emails: string[] }[]> {
  try {
    const hunterData = await this.anymailDataModel.find().exec();

    return hunterData.map(data => ({
      organization: data.companyName,
      emails: data.emails.map(email => email.address),
    }));
  } catch (error) {
    console.error('Error fetching companies and emails:', error);
    throw new Error('Failed to fetch companies and emails');
  }
}


async enrichEntreprisesWithEmails(): Promise<void> {
  try {
    // Récupérer toutes les entreprises dans MySQL
    const entreprises = await this.entrepriseRepository.find();

    console.log(`Found ${entreprises.length} entreprises to process.`);

    for (const entreprise of entreprises) {
      // Rechercher l'entreprise dans MongoDB
      const anymailData = await this.anymailDataModel
        .findOne({ companyName: entreprise.nom })
        .exec();

      if (anymailData && anymailData.emails.length > 0) {
        // Ajouter les emails trouvés à l'entreprise
        const emails = anymailData.emails.map((email) => email.address).join(', ');
        entreprise.email = emails;
        console.log(`Emails updated for entreprise: ${entreprise.nom}`);
      } else {
        // Si aucun email trouvé, marquer comme "Pas d'emails"
        entreprise.email = 'Pas d’emails';
        console.log(`No emails found for entreprise: ${entreprise.nom}`);
      }

      // Sauvegarder les changements dans MySQL
      await this.entrepriseRepository.save(entreprise);
    }

    console.log('Enrichment of entreprises completed.');
  } catch (error) {
    console.error('Error enriching entreprises with emails:', error);
    throw new Error('Failed to enrich entreprises with emails.');
  }
}


async getEntreprisesWithEmails(): Promise<{ id: number; nom: string; emails: string[] }[]> {
  try {
    const entreprises = await this.entrepriseRepository.find();
    return entreprises.map((entreprise) => ({
      id: entreprise.id,
      nom: entreprise.nom,
      emails: entreprise.email ? entreprise.email.split(',').map((email) => email.trim()) : [],
      site_web: entreprise.site_web || '', 
    }));
  } catch (error) {
    console.error('Error fetching entreprises with emails:', error);
    throw new Error('Failed to fetch entreprises with emails.');
  }
}

async updateEntrepriseDetails(id: number, emails: string[], site_web?: string): Promise<void> {
  try {
    const entreprise = await this.entrepriseRepository.findOne({ where: { id } });

    if (!entreprise) {
      throw new Error(`Entreprise with ID ${id} not found`);
    }

    // Update emails: replace existing emails with new ones if provided
    if (emails && emails.length > 0) {
      const updatedEmails = emails.filter(email => email && email.trim() !== ''); // Filter valid emails
      entreprise.email = updatedEmails.join(', '); // Join emails as a string
    }

    // Update site_web if provided
    if (site_web) {
      entreprise.site_web = site_web.trim(); // Set site_web
    }

    await this.entrepriseRepository.save(entreprise);
    console.log(
      `Updated details for entreprise ${entreprise.nom}: Emails - ${entreprise.email}, Site Web - ${entreprise.site_web || 'N/A'}`
    );
  } catch (error) {
    console.error('Error updating entreprise details:', error);
    throw new Error('Failed to update entreprise details.');
  }
}


}
