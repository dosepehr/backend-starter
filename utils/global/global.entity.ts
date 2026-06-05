import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiProperty({ example: 1 })
  @Expose()
  id: number;

  @ApiProperty({ example: 'john_doe' })
  @Expose()
  name: string;
}

export abstract class GlobalEntity extends BaseEntity {
  @ApiProperty({ example: 1 })
  @Expose()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  @Expose()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  @Expose()
  @UpdateDateColumn()
  updatedAt: Date;

  @ApiPropertyOptional({ example: null, nullable: true })
  @Expose()
  @DeleteDateColumn()
  deletedAt: Date | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  @Expose()
  @Column({ type: 'timestamp', nullable: true, default: null })
  recoveredAt: Date | null;

  @ApiPropertyOptional({ type: AuditUserDto, nullable: true })
  @Expose()
  @Transform(({ value }) => (value ? { id: value.id, name: value.name } : null))
  @Type(() => AuditUserDto)
  @ManyToOne(() => User, { nullable: true, eager: false, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdBy' })
  createdBy?: User | null;

  @ApiPropertyOptional({ type: AuditUserDto, nullable: true })
  @Expose()
  @Transform(({ value }) => (value ? { id: value.id, name: value.name } : null))
  @Type(() => AuditUserDto)
  @ManyToOne(() => User, { nullable: true, eager: false, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'updatedBy' })
  updatedBy?: User | null;

  @ApiPropertyOptional({ type: AuditUserDto, nullable: true })
  @Expose()
  @Transform(({ value }) => (value ? { id: value.id, name: value.name } : null))
  @Type(() => AuditUserDto)
  @ManyToOne(() => User, { nullable: true, eager: false, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'deletedBy' })
  deletedBy?: User | null;

  @ApiPropertyOptional({ type: AuditUserDto, nullable: true })
  @Expose()
  @Transform(({ value }) => (value ? { id: value.id, name: value.name } : null))
  @Type(() => AuditUserDto)
  @ManyToOne(() => User, { nullable: true, eager: false, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'recoveredBy' })
  recoveredBy?: User | null;
}
