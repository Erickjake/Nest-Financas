// src/main.ts
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import cookieParser from "cookie-parser";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Sem essa linha, o Passport não vai conseguir ler o cookie 'access_token'
  app.use(cookieParser());

  await app.listen(3000);
}
bootstrap();
