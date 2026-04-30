import { Controller, Get, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { ResponseMessage } from 'utils/decorators/response-message.decorator';
import { AuthGuard } from 'utils/guards/auth.guard';
import { RolesGuard } from 'utils/guards/roles.guard';
import { Roles } from 'utils/decorators/roles.decorator';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from 'utils/decorators/current-user.decorator';
import { type AuthenticatedUser } from 'utils/interfaces/jwt-payload.interface';
import { UserRole } from './modules/users/enums/user-role.enum';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ResponseMessage('Welcome to Nest Starter')
  getHello() {
    return this.appService.getHello();
  }
  @Get('admin-only')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ResponseMessage('Welcome to Admin')
  adminRoute(@CurrentUser() user: AuthenticatedUser) {
    return { user: user };
  }
}
