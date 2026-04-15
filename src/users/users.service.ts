import { Injectable } from "@nestjs/common";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { PrismaService } from "src/prisma/prisma.service";
import bcrypt from "bcrypt";

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}
  async create(createUserDto: CreateUserDto) {
    const salt = await bcrypt.genSalt(10);

    const hashedPassword = await bcrypt.hash(createUserDto.password, salt);

    const data = await this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
      },
    });
  }

  async findAll() {
    return await this.prisma.user.findMany();
  }

  async findOne(id: number) {
    const data = await this.prisma.user.findUnique({
      where: {
        id,
      },
    });
    return data;
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const data = await this.prisma.user.update({
      where: {
        id,
      },
      data: updateUserDto,
    });
    return data;
  }

  async remove(id: number) {
    const data = await this.prisma.user.delete({
      where: {
        id,
      },
    });
    return data;
  }
}
