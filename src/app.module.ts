import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { validateEnv } from './env';
import { DatabaseModule } from './common/database/database.module';
import { AuthModule } from './auth/auth.module';
import { JwtGuard } from './auth/jwt.guard';
import { UsersModule } from './users/users.module';
import { PatientsModule } from './patients/patients.module';
import { DoctorsModule } from './doctors/doctors.module';
import { WorkScheduleModule } from './work-schedule/work-schedule.module';
import { CalendarModule } from './calendar/calendar.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { MedicalRecordsModule } from './medical-records/medical-records.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    PatientsModule,
    DoctorsModule,
    WorkScheduleModule,
    CalendarModule,
    AppointmentsModule,
    MedicalRecordsModule,
  ],
  controllers: [HealthController],
  providers: [
    // RF01/RN01 - guard global: toda rota exige autenticacao, exceto as
    // marcadas com @PublicRoute() (login, health). Registrado aqui (e
    // nao em main.ts) para poder injetar JwtService/Reflector via DI.
    {
      provide: APP_GUARD,
      useClass: JwtGuard,
    },
  ],
})
export class AppModule {}
