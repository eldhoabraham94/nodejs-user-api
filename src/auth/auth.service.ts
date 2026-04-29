import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

export interface UserWithToken extends User {
  access_token: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<UserWithToken> {
    const user = await this.usersService.register(dto);
    return { ...user, access_token: this.generateToken(user) };
  }

  async login(dto: LoginDto): Promise<UserWithToken> {
    const user = await this.usersService.validateCredentials(dto);
    return { ...user, access_token: this.generateToken(user) };
  }

  private generateToken(user: User): string {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    return this.jwtService.sign(payload);
  }
}
