import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { MobileDto } from './mobile.dto';

export class ResendOtpDto extends MobileDto {
  @ApiProperty({ example: 'login', enum: ['login', 'signup'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['login', 'signup'])
  type: 'login' | 'signup';
}
