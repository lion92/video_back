// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Activer CORS pour autoriser toutes les origines
  app.enableCors({
    origin: '*', // Autorise toutes les origines
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS', // Méthodes autorisées
    allowedHeaders: 'Content-Type, Authorization', // En-têtes autorisés
  });

  await app.listen(3006);
}
bootstrap();
