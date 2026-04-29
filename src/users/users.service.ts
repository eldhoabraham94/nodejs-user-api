import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from '../auth/dto/login.dto';
import { RegisterDto } from '../auth/dto/register.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role, User } from './entities/user.entity';
import { IUserRepository, USER_REPOSITORY } from './interfaces/user-repository.interface';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async register(dto: RegisterDto): Promise<User> {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const hashed = await bcrypt.hash(dto.password, 10);
    return this.userRepository.create({
      name: dto.name,
      email: dto.email,
      password: hashed,
      role: Role.USER,
    });
  }

  async validateCredentials(dto: LoginDto): Promise<User> {
    const user = await this.userRepository.findByEmailWithPassword(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.findAll();
  }

  async findOne(requesterId: string, requesterRole: Role, targetId: string): Promise<User> {
    this.assertAccess(requesterId, requesterRole, targetId);

    const user = await this.userRepository.findById(targetId);
    if (!user) {
      throw new NotFoundException(`User ${targetId} not found`);
    }

    return user;
  }

  async update(
    requesterId: string,
    requesterRole: Role,
    targetId: string,
    dto: UpdateUserDto,
  ): Promise<User> {
    this.assertAccess(requesterId, requesterRole, targetId);

    const user = await this.userRepository.findById(targetId);
    if (!user) {
      throw new NotFoundException(`User ${targetId} not found`);
    }

    const payload: Partial<User> = {};
    if (dto.name !== undefined) payload.name = dto.name;
    if (dto.email !== undefined) payload.email = dto.email;
    if (dto.password !== undefined) payload.password = await bcrypt.hash(dto.password, 10);
    if (dto.role !== undefined && requesterRole === Role.ADMIN) payload.role = dto.role;

    return this.userRepository.update(targetId, payload);
  }

  async remove(requesterId: string, targetId: string): Promise<void> {
    if (requesterId === targetId) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    const user = await this.userRepository.findById(targetId);
    if (!user) {
      throw new NotFoundException(`User ${targetId} not found`);
    }

    await this.userRepository.delete(targetId);
  }

  private assertAccess(requesterId: string, requesterRole: Role, targetId: string): void {
    if (requesterRole !== Role.ADMIN && requesterId !== targetId) {
      throw new ForbiddenException('Access denied');
    }
  }
}
