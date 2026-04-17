// src/prisma/prisma.module.ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Essa palavra mágica permite usar o Prisma em qualquer lugar do projeto!
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // Isso "exporta" o serviço para que os outros arquivos possam enxergá-lo
})
export class PrismaModule {}
