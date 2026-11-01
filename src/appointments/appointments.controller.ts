import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { QueryAppointmentsDto } from './dto/query-appointments.dto';
import { UpdateAppointmentStatusDto } from './dto/update-status.dto';
import { Roles } from '../auth/decorator/roles.decorator';
import { CurrentUser } from '../auth/decorator/current-user.decorator';
import { AuthUser } from '../auth/dto/jwt-payload';
import { AppError } from '../common/errors/app-error';
import { DoctorsService } from '../doctors/doctors.service';

@Controller('appointments')
export class AppointmentsController {
  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly doctorsService: DoctorsService,
  ) {}

  @Roles('admin', 'secretary')
  @Post()
  create(@Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.create(dto);
  }

  /**
   * RN13 - um usuario com perfil "doctor" so pode ver os PROPRIOS
   * agendamentos: o doctorId do filtro e forcado a partir do token,
   * ignorando qualquer doctorId que venha na query string.
   */
  @Get()
  async list(@Query() query: QueryAppointmentsDto, @CurrentUser() user: AuthUser) {
    const filter: {
      doctorId?: number;
      patientId?: number;
      status?: typeof query.status;
      from?: Date;
      to?: Date;
    } = {
      doctorId: query.doctorId,
      patientId: query.patientId,
      status: query.status,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    };

    if (user.roles.includes('doctor') && !user.roles.includes('admin')) {
      const ownDoctor = await this.doctorsService.findByUserId(user.id);
      filter.doctorId = ownDoctor?.id ?? -1;
    }

    return this.appointmentsService.list(filter, query.page, query.pageSize);
  }

  /** RN13 - medico so pode abrir o detalhe dos proprios agendamentos. */
  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    const appointment = await this.appointmentsService.findById(id);

    if (user.roles.includes('doctor') && !user.roles.includes('admin')) {
      const ownDoctor = await this.doctorsService.findByUserId(user.id);
      if (!ownDoctor || ownDoctor.id !== appointment.doctorId) {
        throw new AppError('ACESSO_NEGADO', 'Voce nao tem acesso a este agendamento.');
      }
    }

    return appointment;
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAppointmentStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.appointmentsService.updateStatus(id, dto.status, user);
  }
}
