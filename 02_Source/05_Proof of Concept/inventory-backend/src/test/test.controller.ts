import { Controller, Get, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RolesGuard } from '../auth/roles.guard'
import { Roles } from '../auth/roles.decorator'
import { TestService } from './test.service'

@Controller('test')
export class TestController {
  constructor(private readonly testService: TestService) {}

  @Get('all')
  @UseGuards(JwtAuthGuard)
  all() {
    // Protected route for any authenticated user
    return { message: 'Accessible to authenticated users' }
  }

  @Get('manager')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('manager')
  manager() {
    // Protected route for users with the 'manager' role
    return { message: 'Accessible to managers only' }
  }
}
