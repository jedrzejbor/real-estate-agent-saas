import { Module } from '@nestjs/common';
import { ReleaseFlagsService } from './release-flags.service';

@Module({
  providers: [ReleaseFlagsService],
  exports: [ReleaseFlagsService],
})
export class ReleaseFlagsModule {}
