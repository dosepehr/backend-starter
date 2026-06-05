import { Exclude, Expose } from 'class-transformer';
import { Column, Entity } from 'typeorm';
import { UserRole } from '../enums/user-role.enum';
import { GlobalEntity } from 'utils/global/global.entity';

@Entity('users')
export class User extends GlobalEntity {
  @Expose()
  @Column({ length: 20, unique: true })
  name: string;

  @Expose()
  @Column({ length: 11, unique: true })
  mobile: string;

  @Exclude()
  @Column({ select: false })
  password: string;

  @Expose()
  @Column({
    type: 'enum',
    enum: ['USER', 'ADMIN'],
    default: 'USER',
  })
  role: UserRole;
}
