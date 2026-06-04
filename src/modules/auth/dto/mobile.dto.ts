import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

const MOBILE_REGEX = /^09\d{9}$/;

export class MobileDto {
  @ApiProperty({ example: '09123456789' })
  @IsString()
  @IsNotEmpty()
  @Matches(MOBILE_REGEX, { message: 'Invalid mobile number format' })
  mobile: string;
}
