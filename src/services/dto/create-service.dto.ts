import { IsNumber, IsString, Min } from 'class-validator';

export class CreateServiceDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(1)
  durationMinutes: number;

  @IsNumber()
  @Min(0)
  price: number;
}
