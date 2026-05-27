import { Body, Controller, Post } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiTags } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive, IsString } from 'class-validator';
import { Public } from './public.decorator';

/**
 * Placeholder login endpoint — issues a JWT given a customerId.
 * Replace with a real provider (email/password, OAuth, …) before production.
 */
class LoginDto {
  @IsInt()
  @IsPositive()
  customerId!: number;

  @IsOptional()
  @IsString()
  email?: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly jwt: JwtService) {}

  @Public()
  @Post('login')
  async login(@Body() body: LoginDto) {
    const token = await this.jwt.signAsync({
      sub: body.customerId,
      customerId: body.customerId,
      email: body.email,
    });
    return { accessToken: token };
  }
}
