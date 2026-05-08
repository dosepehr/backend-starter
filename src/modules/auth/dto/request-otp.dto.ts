import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestOtpDto {
  @ApiProperty({ example: '09123456789' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^09\d{9}$/, { message: 'Invalid mobile number format' })
  mobile: string;
}
