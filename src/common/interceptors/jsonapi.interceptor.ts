import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { INCLUDE_TOKEN_KEY } from '../../auth/decorators/include-token.decorator';

const USER_ATTRIBUTES = ['name', 'email', 'role', 'createdAt', 'updatedAt'];
const USER_ATTRIBUTES_WITH_TOKEN = [...USER_ATTRIBUTES, 'access_token'];

function serializeUser(user: Record<string, unknown>, includeToken: boolean) {
  const fields = includeToken ? USER_ATTRIBUTES_WITH_TOKEN : USER_ATTRIBUTES;
  const attributes: Record<string, unknown> = {};
  for (const field of fields) {
    if (user[field] !== undefined) {
      attributes[field] = user[field];
    }
  }
  return {
    type: 'users',
    id: user['id'] as string,
    attributes,
  };
}

@Injectable()
export class JsonApiInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const includeToken = this.reflector.getAllAndOverride<boolean>(INCLUDE_TOKEN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) ?? false;

    const res = context.switchToHttp().getResponse<{ set: (h: string, v: string) => void }>();
    res.set('Content-Type', 'application/vnd.api+json');

    return next.handle().pipe(
      map((data: unknown) => {
        if (data === undefined || data === null) return data;

        if (Array.isArray(data)) {
          return {
            data: data.map((item) => serializeUser(item as Record<string, unknown>, false)),
            meta: { count: data.length },
          };
        }

        return { data: serializeUser(data as Record<string, unknown>, includeToken) };
      }),
    );
  }
}
