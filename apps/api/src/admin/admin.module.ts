import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { FootballAdminController } from './football-admin.controller';
import { FootballProviderService } from './football-provider.service';

@Module({ controllers: [AdminController, FootballAdminController], providers: [AdminService, FootballProviderService] })
export class AdminModule {}
