import { Body, Controller, Post } from '@nestjs/common';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';
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
  @Post('login/demo')
  async demoLogin() {
    return this.authService.loginDemo();
  }
}
