// app.module.ts
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { TransactionsModule } from './module/transactions/transactions.module';
import { UsersModule } from './module/users/users.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [TransactionsModule, PrismaModule, UsersModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
