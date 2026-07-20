import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateDealDto {
  @IsString()
  title: string;

  @IsString()
  contactId: string;

  @IsString()
  stageId: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  value?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  probability?: number;

  @IsOptional()
  @IsDateString()
  closeDate?: string;

  @IsOptional()
  @IsString()
  ownerId?: string;
}
