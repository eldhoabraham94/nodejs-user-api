import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { IncludeToken } from './decorators/include-token.decorator';
import { LoginBodyDto } from './dto/login-body.dto';
import { RegisterBodyDto } from './dto/register-body.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @IncludeToken()
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User created; response includes access_token' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  @ApiResponse({ status: 422, description: 'Validation error' })
  register(@Body() body: RegisterBodyDto) {
    return this.authService.register(body.data.attributes);
  }

  @Post('login')
  @IncludeToken()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login and receive access_token' })
  @ApiResponse({ status: 200, description: 'Login successful; response includes access_token' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(@Body() body: LoginBodyDto) {
    return this.authService.login(body.data.attributes);
  }
}
