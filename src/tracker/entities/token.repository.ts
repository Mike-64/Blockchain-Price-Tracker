import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Token } from './token.entity';

export class TokenRepository extends Repository<Token> {
  constructor(
    @InjectRepository(Token)
    private tokenRepository: Repository<Token>,
  ) {
    super(
      tokenRepository.target,
      tokenRepository.manager,
      tokenRepository.queryRunner,
    );
  }
}
