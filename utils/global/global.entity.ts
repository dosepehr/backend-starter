import { User } from 'src/modules/users/entities/user.entity';
import { Expose, Transform, Type } from 'class-transformer';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

class AuditUserDto {
  @Expose()
  id: number;

  @Expose()
  name: string;
}

export abstract class GlobalEntity extends BaseEntity {
  @Expose()
  @PrimaryGeneratedColumn()
  id: number;

  @Expose()
  @CreateDateColumn()
  createdAt: Date;

  @Expose()
  @UpdateDateColumn()
  updatedAt: Date;

  @Expose()
  @DeleteDateColumn()
  deletedAt: Date | null;

  @Expose()
  @Column({ type: 'timestamp', nullable: true, default: null })
  recoveredAt: Date | null;

  @Expose({ name: 'createdBy' })
  @Transform(({ value }) => (value ? { id: value.id, name: value.name } : null))
  @Type(() => AuditUserDto)
  @ManyToOne(() => User, { nullable: true, eager: false, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdBy' })
  createdByUser?: User | null;

  @Expose({ name: 'updatedBy' })
  @Transform(({ value }) => (value ? { id: value.id, name: value.name } : null))
  @Type(() => AuditUserDto)
  @ManyToOne(() => User, { nullable: true, eager: false, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'updatedBy' })
  updatedByUser?: User | null;

  @Expose({ name: 'deletedBy' })
  @Transform(({ value }) => (value ? { id: value.id, name: value.name } : null))
  @Type(() => AuditUserDto)
  @ManyToOne(() => User, { nullable: true, eager: false, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'deletedBy' })
  deletedByUser?: User | null;

  @Expose({ name: 'recoveredBy' })
  @Transform(({ value }) => (value ? { id: value.id, name: value.name } : null))
  @Type(() => AuditUserDto)
  @ManyToOne(() => User, { nullable: true, eager: false, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'recoveredBy' })
  recoveredByUser?: User | null;
}
