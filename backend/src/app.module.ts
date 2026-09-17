import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { AuthModule } from './auth/auth.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { BranchesModule } from './branches/branches.module';
import { UsersModule } from './users/users.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { CustomersModule } from './customers/customers.module';
import { LeadsModule } from './leads/leads.module';
import { TasksModule } from './tasks/tasks.module';
import { MatchingModule } from './matching/matching.module';
import { QuotesModule } from './quotes/quotes.module';
import { DealsModule } from './deals/deals.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuditLogModule,
    AuthModule,
    OrganizationsModule,
    BranchesModule,
    UsersModule,
    VehiclesModule,
    CustomersModule,
    LeadsModule,
    TasksModule,
    MatchingModule,
    QuotesModule,
    DealsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
