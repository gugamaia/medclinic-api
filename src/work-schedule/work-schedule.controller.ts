import { Body, Controller, Get, Param, ParseIntPipe, Put } from '@nestjs/common';
import { WorkScheduleService } from './work-schedule.service';
import { ReplaceWorkScheduleDto } from './dto/replace-work-schedule.dto';
import { Roles } from '../auth/decorator/roles.decorator';

@Controller('doctors/:doctorId/work-schedule')
export class WorkScheduleController {
  constructor(private readonly workScheduleService: WorkScheduleService) {}

  /** Secao 4.9.5 do contrato - somente admin define a escala do medico. */
  @Roles('admin')
  @Put()
  replace(
    @Param('doctorId', ParseIntPipe) doctorId: number,
    @Body() dto: ReplaceWorkScheduleDto,
  ) {
    return this.workScheduleService.replace(doctorId, dto.shifts);
  }

  @Get()
  findOne(@Param('doctorId', ParseIntPipe) doctorId: number) {
    return this.workScheduleService.findByDoctorId(doctorId);
  }
}
