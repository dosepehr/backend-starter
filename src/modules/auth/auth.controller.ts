import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { type Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { CurrentUser } from 'utils/decorators/current-user.decorator';
import { type AuthenticatedUser } from 'utils/interfaces/jwt-payload.interface';
import { DocsResponse } from 'utils/decorators/docs-response.decorator';
import { DocsErrors } from 'utils/decorators/docs-errors.decorator';
import { User } from '../users/entities/user.entity';
import { TokenResponseDto } from './dto/token-response.dto';
import { Public } from 'utils/decorators/public.decorator';
import { VerifyOtpLoginDto } from './dto/verify-otp-login.dto';
import { Roles } from 'utils/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { UpdateMeDto } from './dto/update-me.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SignupDetailsDto } from './dto/signup-details.dto';
import { CompleteSignupDto } from './dto/complete-signup.dto';
import { CheckMobileDto } from './dto/check-mobile.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';

@ApiTags('Auth')
@ApiBearerAuth('access-token')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('check-mobile')
  @HttpCode(HttpStatus.OK)
  @DocsResponse('Mobile checked successfully')
  @DocsErrors(400, 429)
  checkMobile(@Body() dto: CheckMobileDto) {
    return this.authService.checkMobile(dto.mobile);
  }

  @Public()
  @Post('otp/resend')
  @HttpCode(HttpStatus.OK)
  @DocsResponse('OTP resent successfully')
  @DocsErrors(400, 404, 429)
  resendOtp(@Body() dto: ResendOtpDto) {
    return this.authService.resendOtp(dto.mobile, dto.type);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @DocsResponse('Logged in successfully', TokenResponseDto)
  @DocsErrors(400, 401, 429)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('login/otp/verify')
  @HttpCode(HttpStatus.OK)
  @DocsResponse('OTP verified, logged in successfully', TokenResponseDto)
  @DocsErrors(400, 401, 404)
  verifyOtpLogin(@Body() dto: VerifyOtpLoginDto) {
    return this.authService.verifyOtpLogin(dto.mobile, dto.otp);
  }

  @Public()
  @Post('signup/details')
  @HttpCode(HttpStatus.OK)
  @DocsResponse('Signup details saved, OTP sent')
  @DocsErrors(400, 409, 429)
  saveSignupDetails(@Body() dto: SignupDetailsDto) {
    return this.authService.saveSignupDetails(dto);
  }

  @Public()
  @Post('signup/verify')
  @HttpCode(HttpStatus.CREATED)
  @DocsResponse('Account created successfully', TokenResponseDto, {
    status: 201,
  })
  @DocsErrors(400, 401, 404, 409)
  completeSignup(@Body() dto: CompleteSignupDto) {
    return this.authService.completeSignup(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @DocsResponse('Tokens refreshed successfully', TokenResponseDto)
  @DocsErrors(400, 401)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @DocsResponse('Logged out successfully')
  logout(@Req() req: Request, @Body() dto: RefreshTokenDto) {
    const accessToken = req.headers.authorization!.split(' ')[1];
    return this.authService.logout(accessToken, dto.refreshToken);
  }

  @Get('sessions')
  @DocsResponse('Active sessions retrieved')
  getSessions(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getSessions(user.userId);
  }

  @Delete('sessions/:token')
  @HttpCode(HttpStatus.OK)
  @DocsResponse('Session revoked successfully')
  @DocsErrors(404)
  revokeSession(
    @Param('token') token: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.authService.revokeSession(user.userId, token);
  }

  @Get('me')
  @DocsResponse('Profile retrieved successfully', User)
  @DocsErrors(404)
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getMe(user.userId);
  }

  @Roles(UserRole.ADMIN, UserRole.USER)
  @Patch('me')
  @DocsResponse('Profile updated successfully', User)
  @DocsErrors(400, 401, 409)
  updateMe(@Body() dto: UpdateMeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.authService.updateMe(dto, user.userId);
  }

  @Public()
  @Post('password/forgot')
  @HttpCode(HttpStatus.OK)
  @DocsResponse('Password reset OTP sent successfully')
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
