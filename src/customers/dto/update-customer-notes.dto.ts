import { IsString } from 'class-validator';

export class UpdateCustomerNotesDto {
  @IsString()
  notes: string;
}
