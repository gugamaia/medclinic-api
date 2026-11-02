import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateMedicalRecordDto {
  @IsInt()
  @Min(1)
  patientId: number;

  @IsString()
  @IsNotEmpty()
  text: string;
}
