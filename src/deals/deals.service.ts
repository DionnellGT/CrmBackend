import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { MoveDealDto } from './dto/move-deal.dto';
import { QueryDealDto } from './dto/query-deal.dto';

const dealInclude = {
  contact: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  owner: { select: { id: true, name: true } },
  stage: { select: { id: true, name: true, pipelineId: true } },
} satisfies Prisma.DealInclude;

@Injectable()
export class DealsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateDealDto) {
    const lastInStage = await this.prisma.deal.findFirst({
      where: { stageId: dto.stageId },
      orderBy: { order: 'desc' },
    });

    const deal = await this.prisma.deal.create({
      data: {
        title: dto.title,
        contactId: dto.contactId,
        stageId: dto.stageId,
        value: dto.value ?? 0,
        probability: dto.probability ?? 0,
        closeDate: dto.closeDate ? new Date(dto.closeDate) : undefined,
        ownerId: dto.ownerId,
        order: (lastInStage?.order ?? -1) + 1,
      },
      include: dealInclude,
    });

    this.eventEmitter.emit('deal.created', deal);

    return deal;
  }

  async findAll(query: QueryDealDto) {
    return this.prisma.deal.findMany({
      where: {
        ...(query.stageId && { stageId: query.stageId }),
        ...(query.ownerId && { ownerId: query.ownerId }),
        ...(query.contactId && { contactId: query.contactId }),
      },
      include: dealInclude,
      orderBy: { order: 'asc' },
    });
  }

  async findOne(id: string) {
    const deal = await this.prisma.deal.findUnique({
      where: { id },
      include: {
        ...dealInclude,
        activities: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });

    if (!deal) {
      throw new NotFoundException(`Deal ${id} no encontrado`);
    }

    return deal;
  }

  async update(id: string, dto: UpdateDealDto) {
    await this.findOne(id);

    const { closeDate, ...rest } = dto;

    return this.prisma.deal.update({
      where: { id },
      data: {
        ...rest,
        ...(closeDate !== undefined && {
          closeDate: closeDate ? new Date(closeDate) : null,
        }),
      },
      include: dealInclude,
    });
  }

  async remove(id: string) {
    const deal = await this.findOne(id);

    await this.prisma.$transaction([
      this.prisma.deal.delete({ where: { id } }),
      // Compacta el orden de lo que quedó atrás en esa columna
      this.prisma.deal.updateMany({
        where: { stageId: deal.stageId, order: { gt: deal.order } },
        data: { order: { decrement: 1 } },
      }),
    ]);

    return { deleted: true };
  }

  // Corazón del Kanban: mueve un deal a otra posición, ya sea dentro
  // de la misma columna (reordenar) o a una columna distinta.
  async move(id: string, dto: MoveDealDto) {
    const deal = await this.findOne(id);
    const { stageId: fromStageId, order: fromOrder } = deal;
    const { stageId: toStageId, order: toOrder } = dto;

    if (fromStageId === toStageId) {
      if (fromOrder === toOrder) {
        return deal; // no-op, ya está donde debería
      }

      await this.prisma.$transaction(async (tx) => {
        if (toOrder > fromOrder) {
          // se movió hacia abajo: todo lo que estaba entre medio sube un puesto
          await tx.deal.updateMany({
            where: {
              stageId: fromStageId,
              order: { gt: fromOrder, lte: toOrder },
            },
            data: { order: { decrement: 1 } },
          });
        } else {
          // se movió hacia arriba: todo lo que estaba entre medio baja un puesto
          await tx.deal.updateMany({
            where: {
              stageId: fromStageId,
              order: { gte: toOrder, lt: fromOrder },
            },
            data: { order: { increment: 1 } },
          });
        }

        await tx.deal.update({ where: { id }, data: { order: toOrder } });
      });
    } else {
      await this.prisma.$transaction(async (tx) => {
        // compacta la columna de origen (todo lo que estaba después, sube un puesto)
        await tx.deal.updateMany({
          where: { stageId: fromStageId, order: { gt: fromOrder } },
          data: { order: { decrement: 1 } },
        });

        // abre espacio en la columna destino (todo lo que estaba en/después de toOrder, baja un puesto)
        await tx.deal.updateMany({
          where: { stageId: toStageId, order: { gte: toOrder } },
          data: { order: { increment: 1 } },
        });

        await tx.deal.update({
          where: { id },
          data: { stageId: toStageId, order: toOrder },
        });
      });

      const updated = await this.findOne(id);
      // Solo dispara workflows de cambio de etapa en un movimiento real entre columnas
      this.eventEmitter.emit('deal.stage_changed', { ...updated, fromStageId });
      return updated;
    }

    return this.findOne(id);
  }
}
