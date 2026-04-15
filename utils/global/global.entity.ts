import { User } from 'src/modules/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export abstract class GlobalEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true, default: null })
  recoveredAt: Date | null;

  @ManyToOne(() => User, { nullable: true, eager: false, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdBy' })
  createdByUser?: User | null;

  @ManyToOne(() => User, { nullable: true, eager: false, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'updatedBy' })
  updatedByUser?: User | null;

  @ManyToOne(() => User, { nullable: true, eager: false, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'deletedBy' })
  deletedByUser?: User | null;

  @ManyToOne(() => User, { nullable: true, eager: false, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'recoveredBy' })
  recoveredByUser?: User | null;
}
