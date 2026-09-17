import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';

export interface LoginResult {
  accessToken: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    branchId: string | null;
    roles: string[];
  };
}

const GENERIC_LOGIN_ERROR = 'אימייל או סיסמה שגויים.';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditLog: AuditLogService,
  ) {}

  async login(email: string, password: string): Promise<LoginResult> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { roles: true },
    });

    // Same generic message whether the user doesn't exist or the password is
    // wrong — never reveal which one it was.
    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
    }

    const roles = user.roles.map((r) => r.role);

    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        branchId: user.branchId,
        roles,
      },
      {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        // The expiresIn type upstream is narrower than "string" (it wants a
        // template-literal duration like "15m"); this value is env-driven
        // and validated in practice, so a targeted cast is simplest here.
        expiresIn: this.configService.get<string>(
          'JWT_ACCESS_EXPIRES_IN',
          '15m',
        ) as unknown as number,
      },
    );

    await this.auditLog.record({
      entityType: 'User',
      entityId: user.id,
      actorId: user.id,
      action: 'LOGIN',
    });

    return {
      accessToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        branchId: user.branchId,
        roles,
      },
    };
  }

  async hashPassword(plainText: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(plainText, saltRounds);
  }
}
