import { IsArray, IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { TriggerEvent } from '@prisma/client';

// Estructura esperada dentro del JSON de `conditions` (documentado, no validado
// campo a campo porque el shape depende del trigger):
// [{ field: "source", operator: "equals", value: "web" }]
//
// Estructura esperada dentro de `actions`:
// [
//   { type: "SEND_EMAIL", template: "welcome" },
//   { type: "WAIT", days: 2 },
//   { type: "CREATE_TASK", content: "Llamar de seguimiento" },
//   { type: "TAG_CONTACT", tag: "nurtured" }
// ]

export class CreateWorkflowDto {
  @IsString()
  name!: string;

  @IsEnum(TriggerEvent)
  trigger!: TriggerEvent;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  conditions?: Record<string, unknown>[];

  @IsArray()
  actions!: Record<string, unknown>[];
}
