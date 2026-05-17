import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';

@Injectable()
export class GoalsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreateGoalDto) {
    return this.prisma.goal.create({
      data: {
        title: dto.title,
        targetAmount: dto.targetAmount,
        currentAmount: dto.currentAmount ?? 0,
        dueDate: new Date(dto.dueDate),
        user: { connect: { id: userId } },
      },
    });
  }

  async findAll(userId: number) {
    return this.prisma.goal.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: number, userId: number) {
    const goal = await this.prisma.goal.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!goal) {
      throw new NotFoundException('Meta não encontrada');
    }

    return goal;
  }

  async update(id: number, userId: number, dto: UpdateGoalDto) {
    await this.findOne(id, userId);

    return this.prisma.goal.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.targetAmount !== undefined && {
          targetAmount: dto.targetAmount,
        }),
        ...(dto.currentAmount !== undefined && {
          currentAmount: dto.currentAmount,
        }),
        ...(dto.dueDate !== undefined && { dueDate: new Date(dto.dueDate) }),
      },
    });
  }

  async remove(id: number, userId: number) {
    await this.findOne(id, userId);

    return this.prisma.goal.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
