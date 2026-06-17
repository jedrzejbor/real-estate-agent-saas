import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('geocoding_cache')
@Index(['provider', 'normalizedQueryHash'], { unique: true })
@Index(['expiresAt'])
export class GeocodingCache {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 40 })
  provider: string;

  @Column({ type: 'varchar', length: 64, name: 'normalized_query_hash' })
  normalizedQueryHash: string;

  @Column({ type: 'text', name: 'normalized_query', nullable: true })
  normalizedQuery?: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  lat?: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  lng?: number | null;

  @Column({ type: 'text', name: 'formatted_address', nullable: true })
  formattedAddress?: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  precision?: string | null;

  @Column({ type: 'decimal', precision: 4, scale: 3, nullable: true })
  confidence?: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  warning?: string | null;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt: Date;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
