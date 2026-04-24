import { ApiProperty } from '@nestjs/swagger';
import { IsMobilePhone } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: '09123456789' })
  @IsMobilePhone('fa-IR')
  mobile: string;
}
