import { MigrationInterface, QueryRunner } from "typeorm";

export class ClientsInitial1760000000000 implements MigrationInterface {
  name = "ClientsInitial1760000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "clients" (
        "id" SERIAL PRIMARY KEY,
        "code" VARCHAR(255) NOT NULL UNIQUE,
        "name" VARCHAR(255) NOT NULL,
        "type" VARCHAR(255) NOT NULL,
        "email" VARCHAR(255) NOT NULL DEFAULT '',
        "phone" VARCHAR(255) NOT NULL DEFAULT '',
        "company" VARCHAR(255) NOT NULL DEFAULT '',
        "notes" VARCHAR(255) NOT NULL DEFAULT '',
        "created_at" TIMESTAMPTZ NOT NULL,
        "updated_at" TIMESTAMPTZ NOT NULL
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "clients"`);
  }
}
