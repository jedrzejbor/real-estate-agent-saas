import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User, Agent, Agency } from './entities';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Agent, Agency])],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
