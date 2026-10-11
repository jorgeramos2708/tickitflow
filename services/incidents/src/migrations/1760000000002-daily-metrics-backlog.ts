import { MigrationInterface, QueryRunner } from "typeorm";

export class DailyMetricsBacklog1760000000002 implements MigrationInterface {
  name = "DailyMetricsBacklog1760000000002";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "daily_metrics" ADD COLUMN "open_at_end" INTEGER NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_metrics" ADD COLUMN "at_risk_end" INTEGER NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "daily_metrics" DROP COLUMN "at_risk_end"`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_metrics" DROP COLUMN "open_at_end"`,
    );
  }
}
