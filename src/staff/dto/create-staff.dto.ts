import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateStaffDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
