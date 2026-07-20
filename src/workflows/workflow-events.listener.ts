import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TriggerEvent } from '@prisma/client';
import { WorkflowsService } from './workflows.service';

interface ContactCreatedPayload {
  id: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  source?: string | null;
  tags: string[];
  [key: string]: unknown;
}

interface DealEventPayload {
  id: string;
  contactId: string;
  stageId: string;
  fromStageId?: string;
  value: unknown;
  [key: string]: unknown;
}

@Injectable()
export class WorkflowEventsListener {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @OnEvent('contact.created')
  handleContactCreated(payload: ContactCreatedPayload) {
    return this.workflowsService.handleTrigger(
      TriggerEvent.CONTACT_CREATED,
      payload.id,
      payload,
    );
  }

  @OnEvent('deal.created')
  handleDealCreated(payload: DealEventPayload) {
    return this.workflowsService.handleTrigger(TriggerEvent.DEAL_CREATED, payload.id, payload);
  }

  @OnEvent('deal.stage_changed')
  handleDealStageChanged(payload: DealEventPayload) {
    return this.workflowsService.handleTrigger(
      TriggerEvent.DEAL_STAGE_CHANGED,
      payload.id,
      payload,
    );
  }

  @OnEvent('contact.tag_added')
  handleTagAdded(payload: ContactCreatedPayload) {
    return this.workflowsService.handleTrigger(TriggerEvent.TAG_ADDED, payload.id, payload);
  }
}
