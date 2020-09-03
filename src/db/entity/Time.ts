import { Entity, PrimaryColumn, Column } from "typeorm";

@Entity()
export class Time {
  @PrimaryColumn()
  public id!: string;

  @Column()
  public channel!: string;

  @Column({ nullable: true })
  public message?: string;
}
