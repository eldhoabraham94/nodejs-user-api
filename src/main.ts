import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { applyGlobalConfig } from './app-config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Accept both application/json and application/vnd.api+json
  app.use(require('express').json({ type: ['application/json', 'application/vnd.api+json'] }));

  applyGlobalConfig(app);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Users API')
    .setDescription('RESTful user management API following JSON:API specification')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(3000);
}

bootstrap();
