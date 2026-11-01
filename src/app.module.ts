import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './env';
import { DatabaseModule } from './common/database/database.module';
<<<<<<< Updated upstream
=======
import { AuthModule } from './auth/auth.module';
import { JwtGuard } from './auth/jwt.guard';
import { UsersModule } from './users/users.module';
import { PatientsModule } from './patients/patients.module';
import { DoctorsModule } from './doctors/doctors.module';
>>>>>>> Stashed changes
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    DatabaseModule,
<<<<<<< Updated upstream
=======
    AuthModule,
    UsersModule,
    PatientsModule,
    DoctorsModule,
>>>>>>> Stashed changes
  ],
  controllers: [HealthController],
})
export class AppModule {}
