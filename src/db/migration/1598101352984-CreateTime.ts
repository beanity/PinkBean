import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateTime1598101352984 implements MigrationInterface {
  private tableName = "time";
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: this.tableName,
        columns: [
          {
            name: "id",
            type: "text",
            isPrimary: true,
          },
          {
            name: "channel",
            type: "text",
            isNullable: false,
          },
          {
            name: "message",
            type: "text",
            isNullable: true,
          },
        ],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable(this.tableName);
  }
}
