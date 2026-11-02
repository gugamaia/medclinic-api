import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { MedicalRecordsService } from './medical-records.service';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { ListMedicalRecordsQueryDto } from './dto/list-medical-records-query.dto';
import { Roles } from '../auth/decorator/roles.decorator';
import { CurrentUser } from '../auth/decorator/current-user.decorator';
import { AuthUser } from '../auth/dto/jwt-payload';

@Controller()
export class MedicalRecordsController {
  constructor(private readonly medicalRecordsService: MedicalRecordsService) {}

  @Roles('doctor')
  @Post('medical-records')
  create(@Body() dto: CreateMedicalRecordDto, @CurrentUser() user: AuthUser) {
    return this.medicalRecordsService.create(dto, user);
  }

  @Roles('admin', 'secretary', 'doctor')
  @Get('patients/:patientId/medical-records')
  listByPatient(
    @Param('patientId', ParseIntPipe) patientId: number,
    @Query() query: ListMedicalRecordsQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.medicalRecordsService.listByPatient(
      patientId,
      query.page,
      query.pageSize,
      user,
    );
  }
}
