import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthenticatedUser } from 'utils/interfaces/jwt-payload.interface';
import { UserRole } from 'src/modules/users/enums/user-role.enum';
import { User } from 'src/modules/users/entities/user.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const user = context
      .switchToHttp()
      .getRequest<{ user: AuthenticatedUser }>().user;

    if (!user) {
      throw new ForbiddenException(
        'You do not have permission to access this resource',
      );
    }

    const freshUser = await this.userRepository.findOne({
      where: { id: Number(user.userId) },
      select: ['role'],
    });

    if (!freshUser || !requiredRoles.includes(freshUser.role)) {
      throw new ForbiddenException(
        'You do not have permission to access this resource',
      );
    }

    return true;
  }
}
