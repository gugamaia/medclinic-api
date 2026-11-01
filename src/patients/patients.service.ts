import { Injectable } from '@nestjs/common';
import { AppError } from '../common/errors/app-error';
import { paginate, PaginatedResult } from '../common/pagination/paginate';
import { PatientsRepository } from './patients.repository';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PatientResponseDto } from './dto/patient-response.dto';
import { Patient } from './entities/patient.entity';

@Injectable()
export class PatientsService {
  constructor(private readonly patientsRepository: PatientsRepository) {}

  // RF02/RN02 - CPF unico; a restricao do banco (RP04) e a ultima linha
  // de defesa, mas verificamos antes para devolver o erro certo
  // (CPF_JA_CADASTRADO) em vez de um erro generico de violacao de unique.
  async create(dto: CreatePatientDto): Promise<PatientResponseDto> {
    const existing = await this.patientsRepository.findByCpf(dto.cpf);
    if (existing) {
      throw new AppError('CPF_JA_CADASTRADO', 'Este CPF ja esta cadastrado.');
    }

    const patient = this.patientsRepository.create({
      name: dto.name,
      cpf: dto.cpf,
    });
    const saved = await this.patientsRepository.save(patient);
    return this.toResponseDto(saved);
  }

  async list(
    page: number,
    pageSize: number,
    name?: string,
  ): Promise<PaginatedResult<PatientResponseDto>> {
    const [patients, total] = await this.patientsRepository.listPaginated(
      page,
      pageSize,
      name,
    );
    return paginate(patients.map((p) => this.toResponseDto(p)), total, page, pageSize);
  }

  async findById(id: number): Promise<PatientResponseDto> {
    const patient = await this.getOrFail(id);
    return this.toResponseDto(patient);
  }

  async update(id: number, dto: UpdatePatientDto): Promise<PatientResponseDto> {
    const patient = await this.getOrFail(id);

    if (dto.name !== undefined) {
      patient.name = dto.name;
    }

    const saved = await this.patientsRepository.save(patient);
    return this.toResponseDto(saved);
  }

  async remove(id: number): Promise<void> {
    await this.getOrFail(id);
    // Remocao logica - @DeleteDateColumn faz o TypeORM preencher
    // deleted_at e excluir a linha de consultas futuras automaticamente.
    await this.patientsRepository.softDelete(id);
  }

  /** Usado por outros modulos (agendamentos, prontuario) para checar existencia. */
  async getOrFail(id: number): Promise<Patient> {
    const patient = await this.patientsRepository.findOneBy({ id });
    if (!patient) {
      throw new AppError('RECURSO_NAO_ENCONTRADO', 'Paciente nao encontrado.');
    }
    return patient;
  }

  private toResponseDto(patient: Patient): PatientResponseDto {
    return {
      id: patient.id,
      name: patient.name,
      cpf: patient.cpf,
      createdAt: patient.createdAt,
    };
  }
}
