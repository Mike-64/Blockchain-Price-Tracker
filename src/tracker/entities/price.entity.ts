import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity()
export class Price {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  token: string;

  @Column('float')
  price: number;

  @CreateDateColumn()
  timestamp: Date;

  toString() {
    return this.token + '|' + this.price + '|' + this.timestamp;
  }
}
