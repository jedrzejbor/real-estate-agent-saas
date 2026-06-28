import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { PropertyType, TransactionType } from '../../common/enums';
import { Client } from './client.entity';

@Entity('client_preferences')
export class ClientPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: PropertyType, nullable: true })
  propertyType: PropertyType;

  @Column({
    type: 'enum',
    enum: TransactionType,
    enumName: 'client_preference_transaction_type',
    name: 'transaction_type',
    nullable: true,
  })
  transactionType: TransactionType;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  minArea: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  maxPrice: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  preferredCity: string;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'preferred_district',
    nullable: true,
  })
  preferredDistrict: string;

  @Column({ type: 'smallint', nullable: true })
  minRooms: number;

  // ── Relations ──

  @OneToOne(() => Client, (client) => client.preference, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'client_id' })
  client: Client;
}
