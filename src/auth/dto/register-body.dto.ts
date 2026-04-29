import { Type } from 'class-transformer';
import { IsString, ValidateNested } from 'class-validator';
import { RegisterDto } from './register.dto';

class RegisterBodyData {
  @IsString()
  type!: string;

  @ValidateNested()
  @Type(() => RegisterDto)
  attributes!: RegisterDto;
}

export class RegisterBodyDto {
  @ValidateNested()
  @Type(() => RegisterBodyData)
  data!: RegisterBodyData;
}
