import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

export class JsonApiData<T> {
  @ApiProperty({ example: 'users' })
  @IsString()
  type!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  id?: string;

  @IsObject()
  attributes!: T;
}

export class JsonApiBody<T> {
  @ValidateNested()
  @Type(() => JsonApiData)
  data!: JsonApiData<T>;
}
