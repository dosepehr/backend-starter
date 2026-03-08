import {
  Column,
  Entity,
} from 'typeorm';
import { UserRole } from '../enums/user-role.enum';
import { GlobalEntity } from 'utils/global/global.entity';

@Entity('users')
export class User extends GlobalEntity {
  @Column({ length: 20, unique: true })
  name: string;

  @Column({ length: 11, unique: true })
  mobile: string;

  @Column()
  password: string;

  @Column({
    type: 'enum',
    enum: ['USER', 'ADMIN'],
    default: 'USER',
  })
  role: UserRole;
}
