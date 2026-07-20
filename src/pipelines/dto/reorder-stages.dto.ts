import { Type } from 'class-transformer';
import { IsArray, IsInt, IsString, ValidateNested } from 'class-validator';

class StageOrderItem {
  @IsString()
  id!: string;

  @IsInt()
  order!: number;
}

export class ReorderStagesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StageOrderItem)
  stages!: StageOrderItem[];
}
