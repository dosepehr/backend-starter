import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { type Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { LogoutDto } from './dto/logout.dto';
import { AuthGuard } from 'utils/guards/auth.guard';
import { CurrentUser } from 'utils/decorators/current-user.decorator';
import { type AuthenticatedUser } from 'utils/interfaces/jwt-payload.interface';
import {
  DocsResponse,
  DocsResponseNull,
} from 'utils/decorators/docs-response.decorator';
import { DocsErrors } from 'utils/decorators/docs-errors.decorator';
import { User } from '../users/entities/user.entity';
import { TokenResponseDto } from 'utils/interfaces/jwt-payload.interface';
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @DocsResponse('User registered successfully', User)
  @DocsErrors(400, 409)
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @DocsResponse('User logged in successfully', User)
  @DocsErrors(400, 401)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @DocsResponse('Tokens refreshed successfully', TokenResponseDto)
  @DocsErrors(400, 401)
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @ApiBearerAuth('access-token')
  @DocsResponseNull('User logged out successfully')
  @DocsErrors(404)
  logout(@Req() req: Request, @Body() dto: LogoutDto) {
    const accessToken = req.headers.authorization!.split(' ')[1];
    return this.authService.logout(accessToken, dto.refreshToken);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('access-token')
  @DocsResponse('Current user profile fetched successfully', User)
  @DocsErrors(404)
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getMe(user.userId);
  }
}
