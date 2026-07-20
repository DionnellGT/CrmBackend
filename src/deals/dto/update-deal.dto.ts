import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateDealDto } from './create-deal.dto';

// stageId se actualiza vía el endpoint /deals/:id/move, no aquí,
// para no mezclar la lógica de reordenamiento del Kanban con un update normal.
export class UpdateDealDto extends PartialType(
  OmitType(CreateDealDto, ['stageId'] as const),
) {}
