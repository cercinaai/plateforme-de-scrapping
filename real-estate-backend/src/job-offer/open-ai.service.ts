import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { JobOffers } from '../models/JobOffers.schema';

@Injectable()
export class OpenAIService {
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async processJobOffer(jobOffer: JobOffers): Promise<Partial<JobOffers>> {
    const prompt = `
  Vous allez analyser une offre d'emploi et la reformuler sous forme structurée en JSON. Voici les détails de l'offre d'emploi brute :
  Job offer details:
    Title: ${jobOffer.title}
    Description: ${jobOffer.description}
    Location: ${jobOffer.location}
    Contract: ${jobOffer.contract}
    Work Hours: ${jobOffer.workHours}
    Experience: ${jobOffer.experience}
    Qualification: ${jobOffer.qualification}
    Formation: ${jobOffer.formation}
    Salary: ${jobOffer.salary}        
    Company Name: ${jobOffer.company.name}
    SavoirEtre: ${jobOffer.savoirEtre || "Non spécifié"}

### Consignes :
- Reformulez les détails de l'offre d'emploi en respectant les catégories suivantes :
  1. **Specialités** : Choisir parmi les options suivantes :
      - Infirmier en soins généraux, Infirmier en chirurgie, Infirmier anesthésiste, Infirmier en pédiatrie, Infirmier en gériatrie, Infirmier en bloc opératoire, Infirmier en psychiatrie, Soins à domicile, Soins en santé publique, Soins en urgence et préhospitalier, Oncologie, Soins palliatifs et douleur chronique, Néphrologie et dialyse, Médecine du travail, Hygiène hospitalière et maladies infectieuses, Anesthésie et réanimation (IADE), Autres.
  2. **Expérience requise** : Choisir parmi : Pas d'expérience, Entre 1 et 3 ans, Entre 3 et 5 ans, Entre 5 et 10 ans, Plus de 10 ans.
  3. **Temps de travail** : Choisir parmi : Temps plein, Temps partiel, Flexible.
  4. **Lieu** : Reformulez la localisation sous forme de chaîne de caractères au format suivant : 'Ville, Département, Région'.\n
      - Exemple : 'Paris, Hauts-de-Seine, Île-de-France'.
  5. **Type de contrat** : Choisir parmi : CDI, CDD, Intérim, Saisonnier, Stage, Autres.
  6. **Formation requise** : Choisir parmi : Bac+2 : Diplôme d'État Infirmier (DEI), Bac+3 : Licence en soins infirmiers, Bac+4 : Masters ou équivalents spécialisés, Autres certifications (ex. : aide-soignant).
  7. **Salaire** :\n
      - Si un chiffre est mentionné, reformulez sous la forme : 'Salaire brut XXX Euros'.\n
      - Si aucun chiffre n'est mentionné, indiquez : 'Salaire non disponible'.
  8. **Company Email** : Générez automatiquement un email d'entreprise basé sur le nom de la société Company Name.\n
       - Exemple : Pour la société "ASSOCIATION NATIONALE DE PREVENTION EN A",son email  'contact@addictions-france.org'.
  9. **Savoir-être** : Choisir parmi les options suivantes :\n
      - Empathie, Travail en équipe, Capacité d'écoute, Rigueur et organisation.\n
      - Si le champ savoir-être est vide ou "Non spécifié", choisissez automatiquement une ou plusieurs options parmi : Empathie, Travail en équipe, Capacité d'écoute, Rigueur et organisation, en fonction des informations de l'offre.\n
        
### Exemple de réponse attendue en JSON :
{
  "specialties": ["Infirmier en soins généraux", "Soins à domicile"],
  "experience": "Entre 1 et 3 ans",
  "workHours": "Temps plein",
  "location": "Paris, Hauts-de-Seine, Île-de-France",
  "contract": "CDI",
  "formation": "Bac+2 : Diplôme d'État Infirmier (DEI)",
  "salary": "Salaire brut 350.000 Euros",
  "CompanyEmail": "contact@addictions-france.org",
  "CompanyName": "ASSOCIATION NATIONALE DE PREVENTION EN A"
  "SavoirEtre": ["Empathie", "Travail en équipe"]

}
Analysez les données fournies et reformulez-les en respectant ce format.
`;
    const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
            { role: 'system', content: 'You are an expert in analyzing job offers.' },
            { role: 'user', content: prompt },
        ],
        max_tokens: 500,
        temperature: 0.5,
    });
    const result = response.choices[0].message.content.trim();
    const cleanedResult = this.cleanOpenAIResponse(result);
    return this.parseOpenAIResponse(cleanedResult);
}








  private cleanOpenAIResponse(response: string): string {
    return response.replace(/```json|```/g, '').trim();
  }
  

  private parseOpenAIResponse(response: string): Partial<JobOffers> {
    try {
      const parsedResponse = JSON.parse(response);
      return {
        specialties: parsedResponse.specialties || [],
        experience: parsedResponse.experience || '',
        workHours: parsedResponse.workHours || '',
        location: parsedResponse.location || '',
        contract: parsedResponse.contract || '',
        formation: parsedResponse.formation ? [parsedResponse.formation] : [],
        salary: parsedResponse.salary || '',
        company: {
          email: parsedResponse.CompanyEmail || '',
          name: parsedResponse.CompanyName|| '',
        },
        savoirEtre: parsedResponse.SavoirEtre || [],
      };
    } catch (error) {
      console.error('Failed to parse OpenAI response:', response, error);
      return {};
    }
  }
  

  private getSpecialtiesOptions(): string {
    return 'Infirmier en soins généraux, Infirmier en chirurgie, Infirmier anesthésiste, Infirmier en pédiatrie, Infirmier en gériatrie, Infirmier en bloc opératoire, Infirmier en psychiatrie, Soins à domicile, Soins en santé publique, Soins en urgence et préhospitalier, Oncologie, Soins palliatifs et douleur chronique, Néphrologie et dialyse, Médecine du travail, Hygiène hospitalière et maladies infectieuses, Anesthésie et réanimation (IADE), Autres';
  }

  private getSoftSkillsOptions(): string {
    return 'Empathie, Travail en équipe, Capacité d\'écoute, Rigueur et organisation';
  }

  private getExperienceOptions(): string {
    return 'Pas d\'expérience, Entre 1 et 3 ans, Entre 3 et 5 ans, Entre 5 et 10 ans, Plus de 10 ans';
  }

  private getWorkHoursOptions(): string {
    return 'Temps plein, Temps partiel, Flexible';
  }

  private getContractTypeOptions(): string {
    return 'CDI, CDD, Intérim, Saisonnier, Stage, Autres';
  }

  private getEducationOptions(): string {
    return 'Bac+2 : Diplôme d\'État Infirmier (DEI), Bac+3 : Licence en soins infirmiers, Bac+4 : Masters ou équivalents spécialisés, Autres certifications (ex. : aide-soignant)';
  }
}
