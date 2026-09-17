import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly auditLog: AuditLogService,
  ) {}

  async findAll() {
    return this.prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        fullName: true,
        email: true,
        branchId: true,
        isActive: true,
        roles: { select: { role: true, branchScopeId: true } },
      },
      orderBy: { fullName: 'asc' },
    });
  }

  async create(dto: CreateUserDto, actorId: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('כתובת האימייל הזו כבר רשומה במערכת.');
    }

    const passwordHash = await this.authService.hashPassword(dto.password);

    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        passwordHash,
        branchId: dto.branchId,
        roles: {
          create: dto.roles.map((role) => ({ role })),
        },
      },
      include: { roles: true },
    });

    await this.auditLog.record({
      entityType: 'User',
      entityId: user.id,
      actorId,
      action: 'CREATE',
      after: { ...user, passwordHash: undefined },
    });

    const { passwordHash: _omit, ...safeUser } = user;
    return safeUser;
  }
}
