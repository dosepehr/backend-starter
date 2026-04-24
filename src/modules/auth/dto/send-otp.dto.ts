import { IsMobilePhone, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendOtpDto {
  @ApiProperty({ example: '09123456789' })
  @IsString()
  @Length(11, 11)
  @IsMobilePhone('fa-IR')
  mobile: string;
}
