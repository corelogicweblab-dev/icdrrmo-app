import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { OidcAuthService } from './oidc-auth.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const expiresSec = Number(config.get<string>('JWT_ACCESS_EXPIRES_SEC', '900'));
        return {
          secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
          signOptions: {
            expiresIn: Number.isFinite(expiresSec) && expiresSec > 0 ? expiresSec : 900,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, OidcAuthService],
  exports: [AuthService, JwtModule, OidcAuthService],
})
export class AuthModule {}
