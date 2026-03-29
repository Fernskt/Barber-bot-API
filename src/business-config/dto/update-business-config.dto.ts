import {
  IsOptional,
  IsString,
  IsNumber,
  IsObject,
  IsArray,
} from 'class-validator';

export class UpdateBusinessConfigDto {
  @IsOptional()
  @IsString()
  businessName?: string;

  @IsOptional()
  @IsString()
  welcomeMessage?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsNumber()
  bookingWindowDays?: number;

  @IsOptional()
  @IsObject()
  openingHours?: Record<string, string>;

  @IsOptional()
  @IsArray()
  closedDays?: string[];

  @IsOptional()
  @IsObject()
  bookingSlots?: Record<string, string[]>;
}
