import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class StaffAvailabilityDayDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsBoolean()
  isAvailable: boolean;

  @IsString()
  @IsOptional()
  startTime?: string | null;

  @IsString()
  @IsOptional()
  endTime?: string | null;
}

export class SetStaffAvailabilityDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StaffAvailabilityDayDto)
  schedules: StaffAvailabilityDayDto[];
}
