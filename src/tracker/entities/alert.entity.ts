import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('alerts')
export class Alert {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  token: string;

  @Column('decimal')
  targetPrice: number;

  @Column()
  email: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ default: 'Active' })
  status: string;

  toString() {
    return this.token + '|' + this.targetPrice + '|' + this.email;
  }
}
