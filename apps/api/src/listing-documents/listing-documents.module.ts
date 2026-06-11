import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Listing } from '../listings/entities/listing.entity';
import { UsersModule } from '../users';
import { ListingDocument, ListingDocumentEvent } from './entities';
import { ListingDocumentsController } from './listing-documents.controller';
import { ListingDocumentsService } from './listing-documents.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Listing, ListingDocument, ListingDocumentEvent]),
    UsersModule,
  ],
  controllers: [ListingDocumentsController],
  providers: [ListingDocumentsService],
  exports: [ListingDocumentsService],
})
export class ListingDocumentsModule {}
