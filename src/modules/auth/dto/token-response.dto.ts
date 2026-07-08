import { ApiProperty } from '@nestjs/swagger';

export class TokenResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty({
    description:
      'Access token expiry as a Unix timestamp (seconds), for silent-refresh scheduling.',
    example: 1793930300,
  })
  sessionExpiry: number;
}
