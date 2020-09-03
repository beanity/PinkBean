import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreatePrefix1597044087499 implements MigrationInterface {
  private tableName = "prefix";
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
            name: "content",
            type: "text",
            isNullable: false,
          },
          {
            name: "space",
            type: "boolean",
            isNullable: false,
            default: false,
          },
        ],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable(this.tableName);
  }
}
