import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePipelineDto } from './dto/create-pipeline.dto';
import { CreateStageDto } from './dto/create-stage.dto';
import { ReorderStagesDto } from './dto/reorder-stages.dto';

const DEFAULT_STAGE_NAMES = ['Prospecto', 'Contactado', 'Negociación', 'Ganado', 'Perdido'];

@Injectable()
export class PipelinesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePipelineDto) {
    const stageNames = dto.stages?.length
      ? dto.stages.map((s) => s.name)
      : DEFAULT_STAGE_NAMES;

    return this.prisma.pipeline.create({
      data: {
        name: dto.name,
        isDefault: dto.isDefault ?? false,
        stages: {
          create: stageNames.map((name, index) => ({ name, order: index })),
        },
      },
      include: { stages: { orderBy: { order: 'asc' } } },
    });
  }

  async findAll() {
    return this.prisma.pipeline.findMany({
      include: { stages: { orderBy: { order: 'asc' } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async findPipelineOrThrow(id: string) {
    const pipeline = await this.prisma.pipeline.findUnique({ where: { id } });
    if (!pipeline) {
      throw new NotFoundException(`Pipeline ${id} no encontrado`);
    }
    return pipeline;
  }

  // Vista completa para el Kanban: columnas (stages) con sus deals ordenados,
  // más los datos del contacto que el frontend necesita mostrar en cada card.
  async getBoard(id: string) {
    await this.findPipelineOrThrow(id);

    const stages = await this.prisma.stage.findMany({
      where: { pipelineId: id },
      orderBy: { order: 'asc' },
      include: {
        deals: {
          orderBy: { order: 'asc' },
          include: {
            contact: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
            owner: { select: { id: true, name: true } },
          },
        },
      },
    });

    return { pipelineId: id, stages };
  }

  async addStage(pipelineId: string, dto: CreateStageDto) {
    await this.findPipelineOrThrow(pipelineId);

    const lastStage = await this.prisma.stage.findFirst({
      where: { pipelineId },
      orderBy: { order: 'desc' },
    });

    return this.prisma.stage.create({
      data: {
        name: dto.name,
        pipelineId,
        order: (lastStage?.order ?? -1) + 1,
      },
    });
  }

  async reorderStages(pipelineId: string, dto: ReorderStagesDto) {
    await this.findPipelineOrThrow(pipelineId);

    await this.prisma.$transaction(
      dto.stages.map((s) =>
        this.prisma.stage.update({
          where: { id: s.id },
          data: { order: s.order },
        }),
      ),
    );

    return this.getBoard(pipelineId);
  }

  async removeStage(stageId: string) {
    const stage = await this.prisma.stage.findUnique({
      where: { id: stageId },
      include: { _count: { select: { deals: true } } },
    });

    if (!stage) {
      throw new NotFoundException(`Stage ${stageId} no encontrado`);
    }

    if (stage._count.deals > 0) {
      throw new BadRequestException(
        'No se puede eliminar una columna con deals activos. Mueve los deals primero.',
      );
    }

    await this.prisma.stage.delete({ where: { id: stageId } });
    return { deleted: true };
  }
}
