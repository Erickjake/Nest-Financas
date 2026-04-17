// src/prisma/prisma.service.ts
import 'dotenv/config'; // 1. Garante que o NestJS leia a sua DATABASE_URL do arquivo .env
import { Injectable, type OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg'; // Importa o adaptador oficial do Prisma
import { Pool } from 'pg'; // Importa o motor de conexão real do PostgreSQL
import { PrismaClient } from '../../generated/prisma/client'; // Ajuste os '../' conforme o nível da pasta

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    // 2. Criamos uma "piscina" de conexões seguras usando a URL do seu banco Neon
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    // 3. Colocamos essa piscina dentro do adaptador do Prisma
    const adapter = new PrismaPg(pool);

    // 4. A palavra 'super' chama a classe mãe (PrismaClient) e entrega o adaptador para ela!
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }
}
