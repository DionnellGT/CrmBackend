import { IsInt, IsString, Min } from 'class-validator';

export class MoveDealDto {
  @IsString()
  stageId: string;

  // Posición (0-indexed) dentro de la columna destino, tal como
  // la calcula la librería de drag & drop en el frontend (@dnd-kit)
  @IsInt()
  @Min(0)
  order: number;
}
