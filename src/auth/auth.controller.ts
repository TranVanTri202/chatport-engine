import { Body, Controller, Post } from '@nestjs/common';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsIn, IsString, IsNotEmpty } from 'class-validator';
import { Public } from './public.decorator';
import { AuthService, SocialProvider } from './auth.service';
import { FirebaseAuthService } from './firebase-auth.service';

class FirebaseLoginDto {
  @ApiProperty({ example: 'google', enum: ['google', 'facebook'] })
  @IsIn(['google', 'facebook'])
  provider!: SocialProvider;

  @ApiProperty({ example: 'eyJhbGciOiJSUzI1NiIs...' })
  @IsString()
  idToken!: string;
}

class RefreshTokenDto {
  @ApiProperty({ example: '3213ab1c...' })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

class LocalLoginDto {
  @ApiProperty({ example: 'ban@congty.vn' })
  @IsString()
  @IsNotEmpty()
  email!: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly firebaseAuth: FirebaseAuthService,
    private readonly authService: AuthService,
  ) {}

  @Public()
  @Post('social-login')
  async socialLogin(@Body() body: FirebaseLoginDto) {
    const profile = await this.firebaseAuth.verifyIdToken(body.idToken, body.provider);
    return this.authService.loginWithFirebase(profile);
  }

  @Public()
  @Post('login')
  async login(@Body() body: LocalLoginDto) {
    return this.authService.login(body.email);
  }

  @Public()
  @Post('refresh')
  async refresh(@Body() body: RefreshTokenDto) {
    return this.authService.refresh(body.refreshToken);
  }

  @Public()
  @Post('logout')
  async logout(@Body() body: RefreshTokenDto) {
    await this.authService.logout(body.refreshToken);
    return { ok: true };
  }
}
