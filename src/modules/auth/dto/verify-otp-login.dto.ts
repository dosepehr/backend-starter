import { IsMobilePhone, IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpLoginDto {
  @ApiProperty({ example: '09123456789' })
  @IsString()
  @Length(11, 11)
  @IsMobilePhone('fa-IR')
  mobile: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  @Matches(/^[0-9]{6}$/, { message: 'otp must be 6 digits' })
  otp: string;
}
