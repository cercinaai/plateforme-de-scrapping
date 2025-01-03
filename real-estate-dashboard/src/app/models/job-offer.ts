export interface Company {
    name?: string;
    size?: string;
    description?: string;
  }
  
  export interface JobOffer {
    _id: string;
    link: string;
    title?: string;
    description?: string;
    location?: string;
    salary?: string;
    contract?: string;
    workHours?: string;
    experience?: string;
    qualification?: string;
    industry?: string;
    company?: Company;
    publicationDate?: string | null; 
    savoirEtre?: string;
    formation?: string[];

    //data?.competences
    competences?: string[];
  }
  
  