import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Cria toda a estrutura do banco da Etapa 2 (RP06 - toda estrutura por
 * migration, nunca synchronize:true em producao).
 */
export class CreateSchema1791675893276 implements MigrationInterface {
  name = 'CreateSchema1791675893276';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(150) NOT NULL,
        "email" VARCHAR(150) NOT NULL UNIQUE,
        "password" VARCHAR(255) NOT NULL,
        "roles" TEXT[] NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "patient" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(150) NOT NULL,
        "cpf" VARCHAR(11) NOT NULL UNIQUE,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "doctor" (
        "id" SERIAL PRIMARY KEY,
        "crm" VARCHAR(30) NOT NULL UNIQUE,
        "user_id" INTEGER NOT NULL REFERENCES "user"("id"),
        "created_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "work_shift" (
        "id" SERIAL PRIMARY KEY,
        "doctor_id" INTEGER NOT NULL REFERENCES "doctor"("id") ON DELETE CASCADE,
        "week_day" SMALLINT NOT NULL,
        "start_time" VARCHAR(5) NOT NULL,
        "end_time" VARCHAR(5) NOT NULL,
        "slot_duration_minutes" INTEGER NOT NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_work_shift_doctor_id" ON "work_shift" ("doctor_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "appointment" (
        "id" SERIAL PRIMARY KEY,
        "doctor_id" INTEGER NOT NULL REFERENCES "doctor"("id"),
        "patient_id" INTEGER NOT NULL REFERENCES "patient"("id"),
        "starts_at" TIMESTAMPTZ NOT NULL,
        "ends_at" TIMESTAMPTZ NOT NULL,
        "status" VARCHAR(20) NOT NULL DEFAULT 'scheduled',
        "created_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_appointment_doctor_starts_at" ON "appointment" ("doctor_id", "starts_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_appointment_patient_starts_at" ON "appointment" ("patient_id", "starts_at")`,
    );

    await queryRunner.query(`
      CREATE TABLE "medical_record" (
        "id" SERIAL PRIMARY KEY,
        "patient_id" INTEGER NOT NULL REFERENCES "patient"("id"),
        "doctor_id" INTEGER NOT NULL REFERENCES "doctor"("id"),
        "text" TEXT NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_medical_record_patient_created_at" ON "medical_record" ("patient_id", "created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "medical_record"`);
    await queryRunner.query(`DROP TABLE "appointment"`);
    await queryRunner.query(`DROP TABLE "work_shift"`);
    await queryRunner.query(`DROP TABLE "doctor"`);
    await queryRunner.query(`DROP TABLE "patient"`);
    await queryRunner.query(`DROP TABLE "user"`);
  }
}
