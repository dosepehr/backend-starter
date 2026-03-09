import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
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
  @Column({ type: 'timestamp', nullable: true })
  recoveredAt: Date | null;

  @Column({ type: 'int', nullable: true, default: null })
  createdBy: number;

  @Column({ type: 'int', nullable: true, default: null })
  updatedBy: number;

  @Column({ type: 'int', nullable: true, default: null })
  deletedBy: number;

  @Column({ type: 'int', nullable: true, default: null })
  recoveredBy: number;
}
