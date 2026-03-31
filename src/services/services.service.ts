import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.service.findMany({
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async findById(id: string) {
    const service = await this.prisma.service.findUnique({
      where: { id },
    });

    if (!service) {
      throw new NotFoundException('Servicio no encontrado');
    }

    return service;
  }

  async create(dto: CreateServiceDto) {
    return this.prisma.service.create({
      data: {
        name: dto.name,
        durationMinutes: dto.durationMinutes,
        price: dto.price,
      },
    });
  }

  async update(id: string, dto: UpdateServiceDto) {
    await this.findById(id);

    return this.prisma.service.update({
      where: { id },
      data: dto,
    });
  }
}
