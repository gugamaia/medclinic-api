import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateUsersTable1710000000000 implements MigrationInterface {
  name = "CreateUsersTable1710000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`
    );

    await queryRunner.query(
      `CREATE TYPE "users_role_enum" AS ENUM ('admin', 'atendente')`
    );

    await queryRunner.createTable(
      new Table({
        name: "users",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            default: "uuid_generate_v4()",
          },
          {
            name: "name",
            type: "varchar",
            length: "150",
            isNullable: false,
          },
          {
            name: "email",
            type: "varchar",
            length: "150",
            isUnique: true,
            isNullable: false,
          },
          {
            name: "password",
            type: "varchar",
            length: "255",
            isNullable: false,
          },
          {
            name: "role",
            type: "users_role_enum",
            default: "'atendente'",
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "now()",
          },
        ],
      }),
      true
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("users");
    await queryRunner.query(`DROP TYPE "users_role_enum"`);
  }
}
