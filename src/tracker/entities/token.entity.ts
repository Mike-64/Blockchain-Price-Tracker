import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Token {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  tokenName: string;

  @Column({ type: 'varchar' })
  tokenSymbol: string;

  @Column({ type: 'varchar' })
  usdPrice: string;

  @Column({ type: 'varchar' })
  exchangeName: string;

  @Column({ type: 'varchar' })
  tokenAddress: string;

  @Column({ type: 'varchar' })
  tokenLogo: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdDate: Date;
}
