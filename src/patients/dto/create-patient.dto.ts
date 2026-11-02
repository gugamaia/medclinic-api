import { IsNotEmpty, IsNumberString, IsString, Length } from 'class-validator';

export class CreatePatientDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  // RN02 - CPF com 11 digitos numericos, sem pontuacao.
  @IsNumberString()
  @Length(11, 11)
  cpf: string;
}
