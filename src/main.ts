// src/main.ts
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import cookieParser from "cookie-parser";

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule, {
      logger: ["error", "warn", "log", "debug", "verbose"],
    });
    app.use(cookieParser());
    await app.listen(3000);
  } catch (err) {
    console.error("BOOTSTRAP ERROR:", err);
    process.exit(1);
  }
}
bootstrap();
