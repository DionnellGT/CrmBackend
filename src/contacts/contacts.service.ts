import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { QueryContactDto } from './dto/query-contact.dto';

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}
 
  async create(dto: CreateContactDto) {
    if (dto.email) {
      const existing = await this.prisma.contact.findUnique({
        where: { email: dto.email },
      });
      if (existing) {
        throw new ConflictException('Ya existe un contacto con este email');
      }
    }

    return this.prisma.contact.create({
      data: {
        ...dto,
        customFields: (dto.customFields ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  async findAll(query: QueryContactDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.ContactWhereInput = {
      ...(query.search && {
        OR: [
          { firstName: { contains: query.search, mode: 'insensitive' } },
          { lastName: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
      ...(query.tag && { tags: { has: query.tag } }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.contact.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.contact.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const contact = await this.prisma.contact.findUnique({
      where: { id },
      include: {
        deals: { include: { stage: true } },
        activities: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });

    if (!contact) {
      throw new NotFoundException(`Contacto ${id} no encontrado`);
    }

    return contact;
  }

  async update(id: string, dto: UpdateContactDto) {
    await this.findOne(id); // valida que exista (lanza 404 si no)

    const { customFields, ...rest } = dto;

    return this.prisma.contact.update({
      where: { id },
      data: {
        ...rest,
        ...(customFields !== undefined && {
          customFields: customFields as Prisma.InputJsonValue,
        }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.contact.delete({ where: { id } });
    return { deleted: true };
  }
}
