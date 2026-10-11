import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { logger } from "./logger";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false }),
  );
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(",").map((o) => o.trim()) ?? false,
    credentials: true,
  });
  const port = Number(process.env.PORT ?? 4010);
  if (process.env.SWAGGER === "true" && process.env.NODE_ENV !== "production") {
    const { DocumentBuilder, SwaggerModule } = await import("@nestjs/swagger");
    const config = new DocumentBuilder()
      .setTitle("TickITFlow Clients")
      .setDescription("API del microservicio clients de TickITFlow")
      .setVersion("0.1")
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api/docs", app, document);
    console.log(`[clients-service] Swagger en :${port}/api/docs`);
  }
  await app.listen(port);
  logger.info({ port }, "clients-service escuchando");
}

void bootstrap();
