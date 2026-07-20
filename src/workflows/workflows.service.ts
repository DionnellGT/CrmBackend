import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Prisma, TriggerEvent } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WORKFLOW_QUEUE } from '../queue/queue.module';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { evaluateConditions, WorkflowCondition } from './condition-evaluator';

@Injectable()
export class WorkflowsService {
  private readonly logger = new Logger(WorkflowsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(WORKFLOW_QUEUE) private readonly queue: Queue,
  ) {}

  create(dto: CreateWorkflowDto) {
    return this.prisma.workflow.create({
      data: {
        name: dto.name,
        trigger: dto.trigger,
        isActive: dto.isActive ?? true,
        conditions: (dto.conditions ?? []) as Prisma.InputJsonValue,
        actions: dto.actions as Prisma.InputJsonValue,
      },
    });
  }

  findAll() {
    return this.prisma.workflow.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id },
      include: { executions: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow ${id} no encontrado`);
    }

    return workflow;
  }

  async update(id: string, dto: UpdateWorkflowDto) {
    await this.findOne(id);

    const { conditions, actions, ...rest } = dto;

    return this.prisma.workflow.update({
      where: { id },
      data: {
        ...rest,
        ...(conditions !== undefined && {
          conditions: conditions as Prisma.InputJsonValue,
        }),
        ...(actions !== undefined && { actions: actions as Prisma.InputJsonValue }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.workflow.delete({ where: { id } });
    return { deleted: true };
  }

  // Llamado por el listener de eventos (contact.created, deal.stage_changed, etc.)
  async handleTrigger(trigger: TriggerEvent, contextId: string, payload: Record<string, unknown>) {
    const workflows = await this.prisma.workflow.findMany({
      where: { trigger, isActive: true },
    });

    for (const workflow of workflows) {
      const conditions = workflow.conditions as unknown as WorkflowCondition[];
      const matches = evaluateConditions(conditions, payload);

      if (!matches) continue;

      const execution = await this.prisma.workflowExecution.create({
        data: {
          workflowId: workflow.id,
          contextId,
          status: 'PENDING',
          currentStep: 0,
        },
      });

      await this.queue.add(
        'run-step',
        { executionId: execution.id },
        { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
      );

      this.logger.log(
        `Workflow "${workflow.name}" disparado por ${trigger} → execution ${execution.id}`,
      );
    }
  }
}
