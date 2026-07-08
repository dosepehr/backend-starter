import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { Column, Entity } from 'typeorm';
import { UserRole } from '../enums/user-role.enum';
import { GlobalEntity } from 'utils/global/global.entity';

@Entity('users')
export class User extends GlobalEntity {
  @ApiProperty({ example: 'john_doe' })
  @Expose()
  @Column({ length: 20, unique: true })
  name: string;

  @ApiProperty({ example: '09123456789' })
  @Expose()
  @Column({ length: 11, unique: true })
  mobile: string;

  @ApiPropertyOptional({ example: 'john@example.com', nullable: true })
  @Expose()
  @Column({ type: 'varchar', length: 100, unique: true, nullable: true, default: null })
  email?: string | null;

  @Exclude()
  @Column({ select: false })
  password: string;

  @ApiProperty({ enum: UserRole, example: UserRole.USER })
  @Expose()
  @Column({
    type: 'enum',
    enum: ['USER', 'ADMIN'],
    default: 'USER',
  })
  role: UserRole;

  // Bumped whenever role/privileges change so existing access tokens
  // (which carry the old value) fail verification instantly instead of
  // waiting out their TTL.
  @Exclude()
  @Column({ default: 0 })
  tokenVersion: number;
}
