import { IsNotEmpty, IsString } from 'class-validator';

/** O patientId vem da rota e o doctorId do token; nunca do corpo. */
export class CreateMedicalRecordDto {
  @IsString()
  @IsNotEmpty()
  text: string;
}
