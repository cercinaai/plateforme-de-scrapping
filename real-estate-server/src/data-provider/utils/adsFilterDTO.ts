import { IsOptional, IsNumber, IsBoolean, IsString, IsArray } from 'class-validator';

export class FilterAdsDto {
    @IsNumber()
    page: number;

    @IsNumber()
    limit: number;

    @IsBoolean()
    showTotal: boolean = false;

    @IsArray()
    @IsOptional()
    origin?: string[];

    @IsArray()
    @IsOptional()
    category?: string[];

    @IsNumber()
    @IsOptional()
    minPrice?: number;

    @IsNumber()
    @IsOptional()
    maxPrice?: number;

    @IsNumber()
    @IsOptional()
    minSurface?: number;

    @IsNumber()
    @IsOptional()
    maxSurface?: number;

    @IsNumber()
    @IsOptional()
    minRooms?: number;

    @IsNumber()
    @IsOptional()
    maxRooms?: number;

    @IsString()
    @IsOptional()
    startDate?: string;

    @IsString()
    @IsOptional()
    endDate?: string;

    @IsString()
    @IsOptional()
    city?: string;

    @IsNumber()
    @IsOptional()
    lat?: number;

    @IsNumber()
    @IsOptional()
    lon?: number;

    @IsNumber()
    @IsOptional()
    radius?: number;

    @IsString()
    @IsOptional()
    sortBy?: 'DATE' | 'PRICE' | 'SURFACE';

    @IsString()
    @IsOptional()
    sortOrder?: 'ASC' | 'DESC';

    @IsBoolean()
    @IsOptional()
    isRecent?: boolean;

    @IsBoolean()
    @IsOptional()
    hasTerrace?: boolean;

    @IsBoolean()
    @IsOptional()
    hasCellar?: boolean;

    @IsBoolean()
    @IsOptional()
    hasBalcony?: boolean;

    @IsBoolean()
    @IsOptional()
    hasGarden?: boolean;

    @IsBoolean()
    @IsOptional()
    workToDo?: boolean;

    @IsBoolean()
    @IsOptional()
    hasAirConditioning?: boolean;

    @IsBoolean()
    @IsOptional()
    hasFirePlace?: boolean;

    @IsBoolean()
    @IsOptional()
    hasElevator?: boolean;

    @IsBoolean()
    @IsOptional()
    hasAlarm?: boolean;

    @IsBoolean()
    @IsOptional()
    hasDoorCode?: boolean;

    @IsBoolean()
    @IsOptional()
    hasCaretaker?: boolean;

    @IsBoolean()
    @IsOptional()
    hasIntercom?: boolean;

    @IsBoolean()
    @IsOptional()
    hasPool?: boolean;

    @IsBoolean()
    @IsOptional()
    hasSeparateToilet?: boolean;

    @IsBoolean()
    @IsOptional()
    isDisabledPeopleFriendly?: boolean;

    @IsBoolean()
    @IsOptional()
    hasUnobstructedView?: boolean;

    @IsBoolean()
    @IsOptional()
    hasGarage?: boolean;

    @IsString()
    @IsOptional()
    exposition?: string;

    @IsNumber()
    @IsOptional()
    parkingPlacesQuantity?: number;

}