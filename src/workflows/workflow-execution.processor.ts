import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WORKFLOW_QUEUE } from '../queue/queue.module';

interface RunStepJobData {
  executionId: string;
}

type WorkflowAction =
  | { type: 'WAIT'; days?: number; hours?: number }
  | { type: 'SEND_EMAIL'; template: string }
  | { type: 'CREATE_TASK'; content: string }
  | { type: 'TAG_CONTACT'; tag: string };

@Processor(WORKFLOW_QUEUE)
export class WorkflowExecutionProcessor extends WorkerHost {
  private readonly logger = new Logger(WorkflowExecutionProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(WORKFLOW_QUEUE) private readonly queue: Queue,
  ) {
    super();
  }

  async process(job: Job<RunStepJobData>) {
    const { executionId } = job.data;

    const execution = await this.prisma.workflowExecution.findUnique({
      where: { id: executionId },
      include: { workflow: true },
    });

    if (!execution || execution.status === 'COMPLETED') return;

    const actions = execution.workflow.actions as unknown as WorkflowAction[];
    const step = actions[execution.currentStep];

    // No quedan más pasos → workflow completado
    if (!step) {
      await this.prisma.workflowExecution.update({
        where: { id: executionId },
        data: { status: 'COMPLETED' },
      });
      return;
    }

    await this.prisma.workflowExecution.update({
      where: { id: executionId },
      data: { status: 'RUNNING' },
    });

    // WAIT no ejecuta nada ahora: solo reprograma el siguiente paso con el delay.
    // Esto es lo que persiste en Redis y sobrevive a un reinicio del servidor.
    if (step.type === 'WAIT') {
      const delayMs = (step.days ?? 0) * 86_400_000 + (step.hours ?? 0) * 3_600_000;

      await this.prisma.workflowExecution.update({
        where: { id: executionId },
        data: { status: 'WAITING', currentStep: execution.currentStep + 1 },
      });

      await this.queue.add('run-step', { executionId }, { delay: delayMs });
      this.logger.log(`Execution ${executionId} en espera ${delayMs}ms (paso ${step.type})`);
      return;
    }

    await this.executeAction(step, execution.contextId);

    const nextStep = execution.currentStep + 1;
    await this.prisma.workflowExecution.update({
      where: { id: executionId },
      data: { currentStep: nextStep },
    });

    // Encadena el siguiente paso inmediatamente (delay 0)
    await this.queue.add('run-step', { executionId });
  }

  private async executeAction(action: WorkflowAction, contextId: string) {
    switch (action.type) {
      case 'SEND_EMAIL':
        // Stub: aquí se integraría un proveedor real (Resend, SendGrid, etc.)
        this.logger.log(`[SEND_EMAIL] template="${action.template}" → contexto ${contextId}`);
        break;

      case 'CREATE_TASK': {
        // Busca si el contextId es un contacto o un deal para asociar la tarea correctamente
        const deal = await this.prisma.deal.findUnique({ where: { id: contextId } });

        await this.prisma.activity.create({
          data: {
            type: 'TASK',
            content: action.content,
            contactId: deal ? deal.contactId : contextId,
            dealId: deal ? deal.id : undefined,
          },
        });
        break;
      }

      case 'TAG_CONTACT': {
        const deal = await this.prisma.deal.findUnique({ where: { id: contextId } });
        const contactId = deal ? deal.contactId : contextId;

        const contact = await this.prisma.contact.findUnique({ where: { id: contactId } });
        if (contact && !contact.tags.includes(action.tag)) {
          await this.prisma.contact.update({
            where: { id: contactId },
            data: { tags: { push: action.tag } },
          });
        }
        break;
      }
    }
  }
}
