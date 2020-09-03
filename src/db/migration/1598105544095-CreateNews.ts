import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateNews1598105544095 implements MigrationInterface {
  private tableName = "news";
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
        ],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable(this.tableName);
  }
}
