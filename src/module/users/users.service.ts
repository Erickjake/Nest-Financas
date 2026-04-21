import { ConflictException, Injectable } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateUserDto } from './dto/create-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}
  async create(createUserDto: CreateUserDto) {
    const salt = await bcrypt.genSalt(10);

    const hashedPassword = await bcrypt.hash(createUserDto.password, salt);

    try {
      return await this.prisma.user.create({
        data: {
          ...createUserDto,
          password: hashedPassword,
        },
        omit: { password: true },
      });
    } catch (error: unknown) {
      if ((error as { code?: string }).code === 'P2002') {
        throw new ConflictException('email já está em uso');
      }
      throw error;
    }
  }

  async findAll() {
    return await this.prisma.user.findMany({ omit: { password: true } });
  }

  async findOne(id: number) {
    const data = await this.prisma.user.findUnique({
      where: {
        id,
      },
      omit: { password: true },
    });
    return data;
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const data = await this.prisma.user.update({
      where: {
        id,
      },
      data: updateUserDto,
      omit: { password: true },
    });
    return data;
  }

  async remove(id: number) {
    const data = await this.prisma.user.delete({
      where: {
        id,
      },
      omit: { password: true },
    });
    return data;
  }
  async findByEmail(email: string) {
    return await this.prisma.user.findUnique({
      where: {
        email,
      },
    });
  }

  async setRefreshTokenHash(userId: number, refreshTokenHash: string | null) {
    return await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash },
    });
  }
}
