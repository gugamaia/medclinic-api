import { Injectable } from '@nestjs/common';
import { AppError } from '../common/errors/app-error';
import { paginate, PaginatedResult } from '../common/pagination/paginate';
import { PatientsService } from '../patients/patients.service';
import { DoctorsService } from '../doctors/doctors.service';
import { AppointmentsRepository } from '../appointments/appointments.repository';
import { MedicalRecordsRepository } from './medical-records.repository';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { MedicalRecordResponseDto } from './dto/medical-record-response.dto';
import { MedicalRecord } from './entities/medical-record.entity';
import { AuthUser } from '../auth/dto/jwt-payload';

@Injectable()
export class MedicalRecordsService {
  constructor(
    private readonly medicalRecordsRepository: MedicalRecordsRepository,
    private readonly appointmentsRepository: AppointmentsRepository,
    private readonly patientsService: PatientsService,
    private readonly doctorsService: DoctorsService,
  ) {}

  /**
   * RF09/RN14 - cria uma entrada de prontuario. O doctorId NUNCA vem do
   * corpo da requisicao: e sempre resolvido a partir do usuario
   * autenticado, para impedir que um medico registre entradas em nome de
   * outro. RN14 exige vinculo (consulta em andamento ou concluida) entre
   * esse medico e esse paciente antes de permitir a escrita.
   */
  async create(
    dto: CreateMedicalRecordDto,
    user: AuthUser,
  ): Promise<MedicalRecordResponseDto> {
    await this.patientsService.getOrFail(dto.patientId);

    const doctor = await this.doctorsService.findByUserId(user.id);
    if (!doctor) {
      throw new AppError('ACESSO_NEGADO', 'Usuario autenticado nao e um medico.');
    }

    const hasLink = await this.appointmentsRepository.hasLink(doctor.id, dto.patientId);
    if (!hasLink) {
      throw new AppError(
        'ACESSO_NEGADO',
        'Voce nao tem vinculo de atendimento com este paciente.',
      );
    }

    const record = this.medicalRecordsRepository.create({
      patientId: dto.patientId,
      doctorId: doctor.id,
      text: dto.text,
    });
    const saved = await this.medicalRecordsRepository.save(record);
    return this.toResponseDto(saved);
  }

  /**
   * RF09/RN14 - leitura tambem exige vinculo quando quem pede e um
   * medico; admin e secretary podem consultar livremente (necessario
   * para gestao administrativa do historico do paciente).
   */
  async listByPatient(
    patientId: number,
    page: number,
    pageSize: number,
    user: AuthUser,
  ): Promise<PaginatedResult<MedicalRecordResponseDto>> {
    await this.patientsService.getOrFail(patientId);

    if (user.roles.includes('doctor') && !user.roles.includes('admin')) {
      const doctor = await this.doctorsService.findByUserId(user.id);
      const hasLink = doctor
        ? await this.appointmentsRepository.hasLink(doctor.id, patientId)
        : false;
      if (!hasLink) {
        throw new AppError(
          'ACESSO_NEGADO',
          'Voce nao tem vinculo de atendimento com este paciente.',
        );
      }
    }

    const [records, total] = await this.medicalRecordsRepository.listByPatient(
      patientId,
      page,
      pageSize,
    );
    return paginate(records.map((r) => this.toResponseDto(r)), total, page, pageSize);
  }

  private toResponseDto(record: MedicalRecord): MedicalRecordResponseDto {
    return {
      id: record.id,
      patientId: record.patientId,
      doctorId: record.doctorId,
      text: record.text,
      createdAt: record.createdAt,
    };
  }
}
