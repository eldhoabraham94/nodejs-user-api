import { Type } from 'class-transformer';
import { IsString, ValidateNested } from 'class-validator';
import { LoginDto } from './login.dto';

class LoginBodyData {
  @IsString()
  type!: string;

  @ValidateNested()
  @Type(() => LoginDto)
  attributes!: LoginDto;
}

export class LoginBodyDto {
  @ValidateNested()
  @Type(() => LoginBodyData)
  data!: LoginBodyData;
}
