import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '../entities/user.entity';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Jane Doe' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'jane@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'NewPassword1!', minLength: 8 })
  @IsOptional()
  @MinLength(8)
  password?: string;

  @ApiPropertyOptional({ enum: Role, example: Role.ADMIN })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
