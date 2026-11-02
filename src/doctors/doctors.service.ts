import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppError } from '../common/errors/app-error';
import { paginate, PaginatedResult } from '../common/pagination/paginate';
import { PasswordService } from '../auth/password.service';
import { DoctorsRepository } from './doctors.repository';
import { UsersRepository } from '../users/users.repository';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { DoctorResponseDto } from './dto/doctor-response.dto';
import { Doctor } from './entities/doctor.entity';
import { User } from '../users/entities/user.entity';

/** Violacao de restricao unique do Postgres. */
const POSTGRES_UNIQUE_VIOLATION = '23505';

@Injectable()
export class DoctorsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly doctorsRepository: DoctorsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly passwordService: PasswordService,
  ) {}

  /**
   * RF03/RN03 - cria o usuario de acesso (perfil "doctor") e o registro
   * profissional NA MESMA TRANSACAO. Se qualquer uma das duas gravacoes
   * falhar, a outra e desfeita - nunca fica usuario sem medico nem
   * medico sem usuario.
   *
   * A pre-checagem de e-mail/CRM abaixo existe so para devolver o
   * codigo de erro certo (EMAIL_JA_CADASTRADO / CRM_JA_CADASTRADO) no
   * caminho comum. O catch no final cobre a corrida rara em que duas
   * requisicoes passam na pre-checagem ao mesmo tempo: a transacao
   * inteira e revertida pelo proprio Postgres (constraint unique), e so
   * traduzimos o erro bruto do banco para o nosso envelope.
   */
  async create(dto: CreateDoctorDto): Promise<DoctorResponseDto> {
    const [existingUser, existingDoctor] = await Promise.all([
      this.usersRepository.findByEmail(dto.email),
      this.doctorsRepository.findByCrm(dto.crm),
    ]);

    if (existingUser) {
      throw new AppError(
        'EMAIL_JA_CADASTRADO',
        'Este e-mail ja esta cadastrado.',
      );
    }
    if (existingDoctor) {
      throw new AppError('CRM_JA_CADASTRADO', 'Este CRM ja esta cadastrado.');
    }

    try {
      return await this.dataSource.transaction(async (manager) => {
        const userRepo = manager.getRepository(User);
        const doctorRepo = manager.getRepository(Doctor);

        const user = userRepo.create({
          name: dto.name,
          email: dto.email,
          password: await this.passwordService.hash(dto.password),
          roles: ['doctor'],
        });
        const savedUser = await userRepo.save(user);

        const doctor = doctorRepo.create({
          crm: dto.crm,
          userId: savedUser.id,
        });
        const savedDoctor = await doctorRepo.save(doctor);

        return this.toResponseDto(savedDoctor, savedUser);
      });
    } catch (error) {
      throw this.translateUniqueViolation(error);
    }
  }

  async list(
    page: number,
    pageSize: number,
    name?: string,
  ): Promise<PaginatedResult<DoctorResponseDto>> {
    const [doctors, total] = await this.doctorsRepository.listPaginated(
      page,
      pageSize,
      name,
    );
    return paginate(
      doctors.map((d) => this.toResponseDto(d, d.user)),
      total,
      page,
      pageSize,
    );
  }

  async findById(id: number): Promise<DoctorResponseDto> {
    const doctor = await this.getOrFail(id);
    return this.toResponseDto(doctor, doctor.user);
  }

  /** Usado por outros modulos (escala, agenda, agendamento, prontuario). */
  async getOrFail(id: number): Promise<Doctor> {
    const doctor = await this.doctorsRepository.findByIdWithUser(id);
    if (!doctor) {
      throw new AppError('RECURSO_NAO_ENCONTRADO', 'Medico nao encontrado.');
    }
    return doctor;
  }

  /**
   * Usado para resolver qual Doctor corresponde ao usuario autenticado
   * (RN13 - medico so ve os proprios agendamentos/prontuarios).
   */
  findByUserId(userId: number): Promise<Doctor | null> {
    return this.doctorsRepository.findByUserId(userId);
  }

  private translateUniqueViolation(error: unknown): AppError {
    const dbError = error as { code?: string; detail?: string };
    if (dbError.code === POSTGRES_UNIQUE_VIOLATION) {
      if (dbError.detail?.includes('email')) {
        return new AppError(
          'EMAIL_JA_CADASTRADO',
          'Este e-mail ja esta cadastrado.',
        );
      }
      if (dbError.detail?.includes('crm')) {
        return new AppError(
          'CRM_JA_CADASTRADO',
          'Este CRM ja esta cadastrado.',
        );
      }
    }
    throw error;
  }

  private toResponseDto(doctor: Doctor, user: User): DoctorResponseDto {
    return {
      id: doctor.id,
      crm: doctor.crm,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roles: user.roles,
      },
    };
  }
}
