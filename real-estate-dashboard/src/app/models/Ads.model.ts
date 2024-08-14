export interface Ad_Model {
  origin: string;
  adId: string;
  reference?: string;
  creationDate: Date;
  lastCheckDate: Date;
  title?: string;
  type?: string;
  category?: string;
  publisher?: {
    name?: string;
    storeUrl?: string;
    phoneNumber?: string;
  };
  description?: string;
  url: string;
  pictureUrl?: string;
  pictureUrls?: string[];
  location: Location;
  price?: number;
  originalPrice?: number;
  pricePerSquareMeter?: number;
  propertyCharges?: number;
  propertyTax?: number;
  rooms?: number;
  bedrooms?: number;
  surface?: number;
  landSurface?: number;
  constructionYear?: number;
  floor?: number;
  buildingFloors?: number;
  energyValue?: number;
  energyGrade?: string;
  gasValue?: number;
  gasGrade?: string;
  options?: string[];
  history?: History[];
  duplicates?: Duplicate[];
  phoneNumber?: string;
}
// location.model.ts
export interface Coordinates {
  lat: number;
  lon: number;
}

export interface Location {
  city: string;
  postalCode: string;
  departmentCode?: string;
  regionCode?: string;
  coordinates: Coordinates;
}

// history.model.ts
export interface History {
  action: string;
  differences: any;
  date?: Date;
}

// duplicate.model.ts
export interface Duplicate {
  uniqueId: string;
  origin: string;
}