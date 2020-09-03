import { Entity, PrimaryColumn, Column } from "typeorm";

@Entity()
export class News {
  @PrimaryColumn()
  public id!: string;

  @Column()
  public channel!: string;
}
