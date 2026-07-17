import {
  IsEmail,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsArray,
  Min,
  Max,
} from 'class-validator';

export class CreateContactDto {
  @IsString()
  firstName: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsObject()
  customFields?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  score?: number;
}
