import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { PipelinesService } from './pipelines.service';
import { CreatePipelineDto } from './dto/create-pipeline.dto';
import { CreateStageDto } from './dto/create-stage.dto';
import { ReorderStagesDto } from './dto/reorder-stages.dto';

@Controller('pipelines')
export class PipelinesController {
  constructor(private readonly pipelinesService: PipelinesService) {}

  @Post()
  create(@Body() dto: CreatePipelineDto) {
    return this.pipelinesService.create(dto);
  }

  @Get()
  findAll() {
    return this.pipelinesService.findAll();
  }

  @Get(':id/board')
  getBoard(@Param('id') id: string) {
    return this.pipelinesService.getBoard(id);
  }

  @Post(':id/stages')
  addStage(@Param('id') id: string, @Body() dto: CreateStageDto) {
    return this.pipelinesService.addStage(id, dto);
  }

  @Patch(':id/stages/reorder')
  reorderStages(@Param('id') id: string, @Body() dto: ReorderStagesDto) {
    return this.pipelinesService.reorderStages(id, dto);
  }

  @Delete('stages/:stageId')
  removeStage(@Param('stageId') stageId: string) {
    return this.pipelinesService.removeStage(stageId);
  }
}
