import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsEmail } from 'class-validator';

export class CreateAlertDto {
  @IsString()
  @ApiProperty({
    description: 'Token',
    example: 'eth or polygon or bsc',
  })
  tokenName: string; // e.g., 'ethereum' or 'polygon'

  @IsNumber()
  @ApiProperty({
    description: 'Target Price',
    example: '3000.21',
  })
  dollar: number; // Target price

  @IsEmail()
  @ApiProperty({
    description: 'email',
    example: 'doe@example.com',
  })
  email: string; // Email to notify
}
