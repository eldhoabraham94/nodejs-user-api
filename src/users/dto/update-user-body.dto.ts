import { Type } from 'class-transformer';
import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { UpdateUserDto } from './update-user.dto';

class UpdateUserBodyData {
  @IsString()
  type!: string;

  @IsOptional()
  @IsString()
  id?: string;

  @ValidateNested()
  @Type(() => UpdateUserDto)
  attributes!: UpdateUserDto;
}

export class UpdateUserBodyDto {
  @ValidateNested()
  @Type(() => UpdateUserBodyData)
  data!: UpdateUserBodyData;
}
