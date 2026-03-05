import { Entity, Column } from 'typeorm';
import { GlobalEntity } from 'utils/global/global.entity';

@Entity('animals')
export class Animal extends GlobalEntity {
  @Column()
  name: string;

  @Column()
  age: number;
}
