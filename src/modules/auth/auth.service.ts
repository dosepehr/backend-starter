import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/entities/user.entity';
import { CacheService } from 'utils/cache/cache.service';
import { compareHash, generateHash } from 'utils/funcs/password';
import { TooManyRequestsException } from 'utils/exceptions/too-many-requests.exception';
import { UpdateMeDto } from './dto/update-me.dto';
import { SignupDetailsDto } from './dto/signup-details.dto';
import { CompleteSignupDto } from './dto/complete-signup.dto';
import { OtpService } from './otp.service';
import { SessionService, type RequestContext } from './session.service';

interface SignupData {
  name: string;
  password: string;
}

type OtpType = 'login' | 'signup';

@Injectable()
export class AuthService {
  private readonly SIGNUP_DATA_TTL = 10 * 60;
  private readonly LOGIN_FAIL_TTL = 15 * 60;
  private readonly LOGIN_FAIL_LIMIT = 5;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly cacheService: CacheService,
    private readonly otpService: OtpService,
    private readonly sessionService: SessionService,
  ) {}

  async checkMobile(mobile: string) {
    const user = await this.userRepository.findOne({ where: { mobile } });

    if (user) {
      // TODO: stop returning the OTP in the response body — deliver it via SMS only.
      const otp = await this.otpService.issue('login', mobile);
      return {
        action: 'login' as const,
        message: 'User exists. OTP sent for login.',
        otp,
      };
    }

    return {
      action: 'signup' as const,
      message: 'User not found. Please signup.',
    };
  }

  async resendOtp(mobile: string, type: OtpType) {
    if (type === 'login') {
      const user = await this.userRepository.findOne({ where: { mobile } });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // TODO: stop returning the OTP in the response body — deliver it via SMS only.
      const otp = await this.otpService.issue('login', mobile);
      return { message: 'OTP resent successfully', otp };
    }

    if (type === 'signup') {
      const userExists = await this.userRepository.findOne({ where: { mobile } });
      if (userExists) {
        throw new ConflictException('Mobile is already registered');
      }

      const signupData = await this.cacheService.get<SignupData>(
        `signup:${mobile}`,
      );
      if (!signupData) {
        throw new NotFoundException(
          'Signup data not found. Please complete signup details first.',
        );
      }

      // TODO: stop returning the OTP in the response body — deliver it via SMS only.
      const otp = await this.otpService.issue('signup', mobile);
      return { message: 'OTP resent successfully', otp };
    }

    throw new BadRequestException('Invalid OTP type');
  }

  async login(dto: LoginDto, context?: RequestContext) {
    const lockKey = `login:fail:${dto.mobile}`;
    const failures = (await this.cacheService.get<number>(lockKey)) ?? 0;
    if (failures >= this.LOGIN_FAIL_LIMIT) {
      throw new TooManyRequestsException(
        'Account temporarily locked. Try again in 15 minutes.',
      );
    }

    const user = await this.userRepository
      .createQueryBuilder('user')
      .where('user.mobile = :mobile', { mobile: dto.mobile })
      .addSelect('user.password')
      .getOne();

    if (!user || !(await compareHash(dto.password, user.password))) {
      await this.cacheService.set(lockKey, failures + 1, this.LOGIN_FAIL_TTL);
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.cacheService.del(lockKey);
    return this.sessionService.issueTokenPair(user, context);
  }

  async verifyOtpLogin(mobile: string, otp: string, context?: RequestContext) {
    const isValid = await this.otpService.verify('login', mobile, otp);
    if (!isValid) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    const user = await this.userRepository.findOne({ where: { mobile } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.otpService.clear('login', mobile);

    return this.sessionService.issueTokenPair(user, context);
  }

  async saveSignupDetails(dto: SignupDetailsDto) {
    const userExists = await this.userRepository.findOne({
      where: [{ mobile: dto.mobile }, { name: dto.name }],
    });

    if (userExists) {
      throw new ConflictException('Mobile or username already exists');
    }

    const signupData: SignupData = {
      name: dto.name,
      password: await generateHash(dto.password),
    };

    await this.cacheService.set(
      `signup:${dto.mobile}`,
      signupData,
      this.SIGNUP_DATA_TTL,
    );

    // TODO: stop returning the OTP in the response body — deliver it via SMS only.
    const otp = await this.otpService.issue('signup', dto.mobile);

    return {
      message: 'Registration data saved and OTP sent successfully',
      otp,
    };
  }

  async completeSignup(dto: CompleteSignupDto, context?: RequestContext) {
    const isValid = await this.otpService.verify('signup', dto.mobile, dto.otp);
    if (!isValid) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    const signupData = await this.cacheService.get<SignupData>(
      `signup:${dto.mobile}`,
    );
    if (!signupData) {
      throw new NotFoundException(
        'Registration data not found or expired. Please complete signup details again.',
      );
    }

    const userExists = await this.userRepository.findOne({
      where: [{ mobile: dto.mobile }, { name: signupData.name }],
    });
    if (userExists) {
      throw new ConflictException('Mobile or username already exists');
    }

    const user = this.userRepository.create({
      mobile: dto.mobile,
      name: signupData.name,
      password: signupData.password,
    });

    await this.userRepository.save(user);

    await this.otpService.clear('signup', dto.mobile);
    await this.cacheService.del(`signup:${dto.mobile}`);

    return this.sessionService.issueTokenPair(user, context);
  }

  async refresh(refreshToken: string, context?: RequestContext) {
    return this.sessionService.refresh(refreshToken, context);
  }

  async logout(accessToken: string, refreshToken: string) {
    await this.sessionService.logout(accessToken, refreshToken);
    return { message: 'Logged out successfully' };
  }

  async getSessions(userId: string) {
    return this.sessionService.getSessions(userId);
  }

  async revokeSession(userId: string, token: string) {
    await this.sessionService.revokeSession(userId, token);
    return { message: 'Session revoked' };
  }

  async getMe(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: parseInt(userId, 10) },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async forgotPassword(mobile: string) {
    const user = await this.userRepository.findOne({ where: { mobile } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // TODO: stop returning the OTP in the response body — deliver it via SMS only.
    const otp = await this.otpService.issue('reset', mobile);

    return { message: 'OTP sent successfully', otp };
  }

  async updateMe(dto: UpdateMeDto, userId: string) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .where('user.id = :id', { id: parseInt(userId, 10) })
      .addSelect('user.password')
      .getOne();

    if (!user) throw new NotFoundException('User not found');

    if (dto.oldPassword || dto.newPassword) {
      if (!dto.oldPassword || !dto.newPassword) {
        throw new BadRequestException(
          'Both oldPassword and newPassword are required',
        );
      }

      const isMatch = await compareHash(dto.oldPassword, user.password);
      if (!isMatch) {
        throw new UnauthorizedException('Old password is incorrect');
      }

      user.password = await generateHash(dto.newPassword);
    }

    if (dto.name) {
      const exists = await this.userRepository.findOne({
        where: { name: dto.name },
      });
      if (exists && exists.id !== user.id) {
        throw new ConflictException('Username already taken');
      }
      user.name = dto.name;
    }

    if (dto.email !== undefined) {
      if (dto.email) {
        const exists = await this.userRepository.findOne({
          where: { email: dto.email },
        });
        if (exists && exists.id !== user.id) {
          throw new ConflictException('Email already taken');
        }
      }
      user.email = dto.email ?? null;
    }

    await this.userRepository.save(user);

    return user;
  }

  async resetPassword(
    mobile: string,
    otp: string,
    newPassword: string,
    context?: RequestContext,
  ) {
    const isValid = await this.otpService.verify('reset', mobile, otp);
    if (!isValid) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    const user = await this.userRepository
      .createQueryBuilder('user')
      .where('user.mobile = :mobile', { mobile })
      .addSelect('user.password')
      .getOne();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.password = await generateHash(newPassword);
    await this.userRepository.save(user);
    await this.otpService.clear('reset', mobile);

    return this.sessionService.issueTokenPair(user, context);
  }
}
