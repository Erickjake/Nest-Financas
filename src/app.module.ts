// app.module.ts
import { Module } from "@nestjs/common";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { TransactionsModule } from "./module/transactions/transactions.module";
import { UsersModule } from "./module/users/users.module";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [
    // 🛡️ Rate limiting global: max 100 requests por 15 minutos
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minuto em ms
        limit: 100, // 100 requisições
      },
    ]),
    TransactionsModule,
    PrismaModule,
    UsersModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // 🛡️ Aplicar ThrottlerGuard globalmente
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
