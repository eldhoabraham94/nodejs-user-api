import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';

export const databaseConfig = (config: ConfigService): TypeOrmModuleOptions => {
  const type = config.get<string>('DB_TYPE', 'better-sqlite3');

  if (type === 'better-sqlite3') {
    return {
      type: 'better-sqlite3',
      database: config.get<string>('DB_NAME', './dev.db'),
      entities: [User],
      synchronize: true,
    };
  }

  return {
    type: 'mysql',
    host: config.get<string>('DB_HOST', 'localhost'),
    port: config.get<number>('DB_PORT', 3306),
    username: config.get<string>('DB_USER', 'root'),
    password: config.get<string>('DB_PASS', ''),
    database: config.get<string>('DB_NAME', 'users_api'),
    entities: [User],
    synchronize: true,
  };
};
