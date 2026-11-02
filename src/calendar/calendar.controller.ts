import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { CalendarQueryDto } from './dto/calendar-query.dto';

@Controller('doctors/:doctorId/calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get()
  getCalendar(
    @Param('doctorId', ParseIntPipe) doctorId: number,
    @Query() query: CalendarQueryDto,
  ) {
    return this.calendarService.getCalendar(doctorId, query.from, query.to);
  }
}
