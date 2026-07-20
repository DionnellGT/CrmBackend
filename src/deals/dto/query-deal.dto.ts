import { IsOptional, IsString } from 'class-validator';

export class QueryDealDto {
  @IsOptional()
  @IsString()
  stageId?: string;

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsString()
  contactId?: string;
}
