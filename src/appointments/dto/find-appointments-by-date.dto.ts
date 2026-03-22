import { IsDateString, IsNotEmpty } from 'class-validator';

export class FindAppointmentsByDateDto {
  @IsNotEmpty()
  @IsDateString()
  date: string;
}
