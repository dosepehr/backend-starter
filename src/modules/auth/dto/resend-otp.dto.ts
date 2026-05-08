import { IsString, IsNotEmpty, Matches, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResendOtpDto {
  @ApiProperty({ example: '09123456789' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^09\d{9}$/, { message: 'Invalid mobile number format' })
  mobile: string;

  @ApiProperty({ example: 'login', enum: ['login', 'signup'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['login', 'signup'])
  type: 'login' | 'signup';
}
