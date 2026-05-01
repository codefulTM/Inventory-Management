import { SetMetadata } from '@nestjs/common'

// Decorator để gắn metadata 'roles' lên handler hoặc controller
export const Roles = (...roles: string[]) => SetMetadata('roles', roles)
