import { BadRequestException, INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { getDataSourceToken, TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuthModule } from '../../src/auth/auth.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { JsonApiInterceptor } from '../../src/common/interceptors/jsonapi.interceptor';
import { User } from '../../src/users/entities/user.entity';
import { UsersModule } from '../../src/users/users.module';

export async function createTestApp(): Promise<INestApplication> {
  process.env.JWT_SECRET = 'test-secret-key-for-jest';
  process.env.JWT_EXPIRES_IN = '1h';
  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true }),
      TypeOrmModule.forRoot({
        type: 'better-sqlite3',
        database: ':memory:',
        entities: [User],
        synchronize: true,
        dropSchema: true,
      }),
      AuthModule,
      UsersModule,
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: (errors) => new BadRequestException(errors),
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new JsonApiInterceptor(app.get(Reflector)));

  await app.init();
  return app;
}

export async function clearDatabase(app: INestApplication): Promise<void> {
  const ds = app.get<DataSource>(getDataSourceToken());
  await ds.getRepository(User).clear();
}
