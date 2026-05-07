import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import {  ApiTags } from '@nestjs/swagger';
import { type Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { LogoutDto } from './dto/logout.dto';
import { CurrentUser } from 'utils/decorators/current-user.decorator';
import { type AuthenticatedUser } from 'utils/interfaces/jwt-payload.interface';
import { DocsResponse } from 'utils/decorators/docs-response.decorator';
import { DocsErrors } from 'utils/decorators/docs-errors.decorator';
import { User } from '../users/entities/user.entity';
import { TokenResponseDto } from 'utils/interfaces/jwt-payload.interface';
import { Public } from 'utils/decorators/public.decorator';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpLoginDto } from './dto/verify-otp-login.dto';
import { Roles } from 'utils/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { UpdateMeDto } from './dto/update-me.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SignupDetailsDto } from './dto/signup-details.dto';
import { CompleteSignupDto } from './dto/complete-signup.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @DocsResponse('User logged in successfully', User)
  @DocsErrors(400, 401)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @DocsResponse('Tokens refreshed successfully', TokenResponseDto)
  @DocsErrors(400, 401)
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @DocsResponse('User logged out successfully')
  @DocsErrors(404)
  logout(@Req() req: Request, @Body() dto: LogoutDto) {
    const accessToken = req.headers.authorization!.split(' ')[1];
    return this.authService.logout(accessToken, dto.refreshToken);
  }

  @Public()
  @Post('otp/send')
  @HttpCode(HttpStatus.OK)
  @DocsResponse('OTP sent successfully')
  @DocsErrors(400, 429)
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto.mobile);
  }

  @Public()
  @Post('otp/verify/login')
  @HttpCode(HttpStatus.OK)
  @DocsResponse('Logged in successfully', TokenResponseDto)
  @DocsErrors(400, 401, 404)
  verifyOtpLogin(@Body() dto: VerifyOtpLoginDto) {
    return this.authService.verifyOtpLogin(dto.mobile, dto.otp);
  }

  @Public()
  @Post('signup/details')
  @HttpCode(HttpStatus.OK)
  @DocsResponse('Registration data saved successfully')
  @DocsErrors(400, 409)
  saveSignupDetails(@Body() dto: SignupDetailsDto) {
    return this.authService.saveSignupData(dto);
  }

  @Public()
  @Post('otp/verify/signup')
  @HttpCode(HttpStatus.CREATED)
  @DocsResponse('User registered successfully', TokenResponseDto, {
    status: 201,
  })
  @DocsErrors(400, 401, 404, 409)
  completeSignup(@Body() dto: CompleteSignupDto) {
    return this.authService.completeSignup(dto);
  }

  @Get('me')
  @DocsResponse('Current user profile fetched successfully', User)
  @DocsErrors(404)
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getMe(user.userId);
  }

  @Roles(UserRole.ADMIN, UserRole.USER)
  @Patch('me')
  updateMe(@Body() dto: UpdateMeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.authService.updateMe(dto, user.userId);
  }

  @Public()
  @Post('password/forgot')
  @HttpCode(HttpStatus.OK)
  @DocsResponse('OTP sent successfully')
  @DocsErrors(404, 429)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.mobile);
  }

  @Public()
  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  @DocsResponse('Password reset successfully', TokenResponseDto)
  @DocsErrors(401, 404)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.mobile, dto.otp, dto.newPassword);
  }
}
