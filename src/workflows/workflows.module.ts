import { Module } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { WorkflowsController } from './workflows.controller';
import { WorkflowEventsListener } from './workflow-events.listener';
import { WorkflowExecutionProcessor } from './workflow-execution.processor';

@Module({
  controllers: [WorkflowsController],
  providers: [WorkflowsService, WorkflowEventsListener, WorkflowExecutionProcessor],
})
export class WorkflowsModule {}
