import { Entity, Column } from 'typeorm';
import { GlobalEntity } from 'utils/global/global.entity';

@Entity('humans')
export class Human extends GlobalEntity {
  @Column()
  name: string;

  @Column()
  age: number;
}
