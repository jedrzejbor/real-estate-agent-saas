import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('locations')
@Index(['normalizedName', 'voivodeship'])
@Index(['naturalKey'], { unique: true })
@Index(['simcCode'], { unique: true, where: '"simc_code" IS NOT NULL' })
@Index(['active', 'priority'])
export class Location {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, name: 'normalized_name' })
  normalizedName: string;

  @Column({ type: 'varchar', length: 900, name: 'natural_key' })
  naturalKey: string;

  @Column({ type: 'varchar', length: 1200, name: 'search_text' })
  searchText: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  municipality?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  county?: string | null;

  @Column({ type: 'varchar', length: 255 })
  voivodeship: string;

  @Column({ type: 'varchar', length: 20, name: 'simc_code', nullable: true })
  simcCode?: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  lat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  lng: number;

  @Column({ type: 'integer', default: 50 })
  priority: number;

  @Column({ type: 'varchar', length: 80, default: 'import' })
  source: string;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
