import { Entity, PrimaryColumn, Column } from "typeorm";

@Entity()
export class Prefix {
  @PrimaryColumn()
  public id!: string;

  @Column()
  public content!: string;

  @Column()
  public space!: boolean;
}
