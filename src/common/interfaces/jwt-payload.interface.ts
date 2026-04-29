import { Role } from '../../users/entities/user.entity';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}
