// src/main.ts
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule, {
      logger: ["error", "warn", "log", "debug", "verbose"],
    });
    app.use(cookieParser());

    // 🛡️ Ativar validação global de DTOs
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true, // Remove campos não definidos no DTO
        forbidNonWhitelisted: true, // Lança erro se campos extras forem enviados
        transform: true, // Transforma tipos automaticamente
      }),
    );

    await app.listen(3000, "0.0.0.0");
  } catch (err) {
    console.error("BOOTSTRAP ERROR:", err);
    process.exit(1);
  }
}
bootstrap();
