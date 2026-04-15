import { Module } from "@nestjs/common";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // 👈 Essencial para o AuthModule conseguir achar o usuário no banco
})
export class UsersModule {}
