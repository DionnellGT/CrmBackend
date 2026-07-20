import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class InitialStageDto {
  @IsString()
  name: string;
}

export class CreatePipelineDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  // Si no se pasan, el servicio crea un set por defecto (ver PipelinesService)
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InitialStageDto)
  stages?: InitialStageDto[];
}
