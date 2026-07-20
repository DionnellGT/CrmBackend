import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { DealsService } from './deals.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { MoveDealDto } from './dto/move-deal.dto';
import { QueryDealDto } from './dto/query-deal.dto';

@Controller('deals')
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Post()
  create(@Body() dto: CreateDealDto) {
    return this.dealsService.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryDealDto) {
    return this.dealsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.dealsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDealDto) {
    return this.dealsService.update(id, dto);
  }

  @Patch(':id/move')
  move(@Param('id') id: string, @Body() dto: MoveDealDto) {
    return this.dealsService.move(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.dealsService.remove(id);
  }
}
