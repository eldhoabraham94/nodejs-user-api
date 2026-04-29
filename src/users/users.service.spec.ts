import { ConflictException, ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { IUserRepository, USER_REPOSITORY } from './interfaces/user-repository.interface';
import { Role, User } from './entities/user.entity';
import { UsersService } from './users.service';

const makeUser = (overrides: Partial<User> = {}): User =>
  ({
    id: 'user-1',
    name: 'Alice',
    email: 'alice@example.com',
    password: 'hashed',
    role: Role.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as User;

describe('UsersService', () => {
  let service: UsersService;
  let repo: jest.Mocked<IUserRepository>;

  beforeEach(async () => {
    repo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByEmailWithPassword: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: USER_REPOSITORY, useValue: repo },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── register ────────────────────────────────────────────────────────────────

  describe('register', () => {
    it('creates and returns user on success', async () => {
      repo.findByEmail.mockResolvedValue(null);
      repo.create.mockResolvedValue(makeUser());

      const result = await service.register({ name: 'Alice', email: 'alice@example.com', password: 'Password1!' });

      expect(repo.create).toHaveBeenCalled();
      expect(result.email).toBe('alice@example.com');
    });

    it('throws ConflictException when email is already taken', async () => {
      repo.findByEmail.mockResolvedValue(makeUser());

      await expect(
        service.register({ name: 'Alice', email: 'alice@example.com', password: 'Password1!' }),
      ).rejects.toThrow(ConflictException);
    });

    it('stores a bcrypt hash, not the plain password', async () => {
      repo.findByEmail.mockResolvedValue(null);
      repo.create.mockResolvedValue(makeUser());

      await service.register({ name: 'Alice', email: 'alice@example.com', password: 'Password1!' });

      const stored: string = repo.create.mock.calls[0][0].password as string;
      expect(stored).not.toBe('Password1!');
      expect(await bcrypt.compare('Password1!', stored)).toBe(true);
    });
  });

  // ─── validateCredentials ─────────────────────────────────────────────────────

  describe('validateCredentials', () => {
    it('returns user on valid credentials', async () => {
      const hashed = await bcrypt.hash('Password1!', 10);
      repo.findByEmailWithPassword.mockResolvedValue(makeUser({ password: hashed }));

      const result = await service.validateCredentials({ email: 'alice@example.com', password: 'Password1!' });

      expect(result.email).toBe('alice@example.com');
    });

    it('throws UnauthorizedException for unknown email', async () => {
      repo.findByEmailWithPassword.mockResolvedValue(null);

      await expect(
        service.validateCredentials({ email: 'nobody@example.com', password: 'Password1!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for wrong password', async () => {
      const hashed = await bcrypt.hash('CorrectPassword1!', 10);
      repo.findByEmailWithPassword.mockResolvedValue(makeUser({ password: hashed }));

      await expect(
        service.validateCredentials({ email: 'alice@example.com', password: 'WrongPassword1!' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── findAll ─────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns all users', async () => {
      const users = [makeUser(), makeUser({ id: 'user-2' })];
      repo.findAll.mockResolvedValue(users);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
    });
  });

  // ─── findOne ─────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('allows ADMIN to view any user', async () => {
      const target = makeUser({ id: 'user-2' });
      repo.findById.mockResolvedValue(target);

      const result = await service.findOne('admin-1', Role.ADMIN, 'user-2');

      expect(result).toEqual(target);
    });

    it('allows USER to view their own record', async () => {
      const user = makeUser();
      repo.findById.mockResolvedValue(user);

      const result = await service.findOne('user-1', Role.USER, 'user-1');

      expect(result).toEqual(user);
    });

    it('throws ForbiddenException when USER views a foreign record', async () => {
      await expect(service.findOne('user-1', Role.USER, 'user-2')).rejects.toThrow(ForbiddenException);
      expect(repo.findById).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when user does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.findOne('admin-1', Role.ADMIN, 'ghost')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── update ──────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('allows USER to update their own record', async () => {
      const updated = makeUser({ name: 'Alice B' });
      repo.findById.mockResolvedValue(makeUser());
      repo.update.mockResolvedValue(updated);

      const result = await service.update('user-1', Role.USER, 'user-1', { name: 'Alice B' });

      expect(result.name).toBe('Alice B');
    });

    it('silently ignores role change when requester is USER', async () => {
      repo.findById.mockResolvedValue(makeUser());
      repo.update.mockResolvedValue(makeUser());

      await service.update('user-1', Role.USER, 'user-1', { role: Role.ADMIN });

      const payload = repo.update.mock.calls[0][1];
      expect(payload.role).toBeUndefined();
    });

    it('allows ADMIN to change role', async () => {
      repo.findById.mockResolvedValue(makeUser());
      repo.update.mockResolvedValue(makeUser({ role: Role.ADMIN }));

      await service.update('admin-1', Role.ADMIN, 'user-1', { role: Role.ADMIN });

      const payload = repo.update.mock.calls[0][1];
      expect(payload.role).toBe(Role.ADMIN);
    });

    it('throws ForbiddenException when USER updates a foreign record', async () => {
      await expect(service.update('user-1', Role.USER, 'user-2', { name: 'Hacker' })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFoundException when target user does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.update('admin-1', Role.ADMIN, 'ghost', { name: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  // ─── remove ──────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('allows ADMIN to delete another user', async () => {
      repo.findById.mockResolvedValue(makeUser({ id: 'user-2' }));

      await service.remove('admin-1', 'user-2');

      expect(repo.delete).toHaveBeenCalledWith('user-2');
    });

    it('throws ForbiddenException on self-delete', async () => {
      await expect(service.remove('admin-1', 'admin-1')).rejects.toThrow(ForbiddenException);
      expect(repo.delete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when target user does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.remove('admin-1', 'ghost')).rejects.toThrow(NotFoundException);
    });
  });
});
