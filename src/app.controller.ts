import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiExcludeController } from '@nestjs/swagger';

@ApiExcludeController()
@Controller()
export class AppController {
  constructor() {}

  @Get()
  showLandingPage(@Res() res: Response): void {
    res.redirect('/api');
  }
}
