import { Exclude } from 'class-transformer';
import { File } from 'src/modules/file/entities/file.entity';
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { GlobalEntity } from 'utils/global/global.entity';

@Entity('humans')
export class Human extends GlobalEntity {
  @Column()
  name: string;

  @Column()
  age: number;

  @Column({ nullable: true, select: false })
  profileId: number;

  @ManyToOne(() => File, { nullable: true, eager: false })
  @JoinColumn({ name: 'profileId' })
  profile: File;
}
