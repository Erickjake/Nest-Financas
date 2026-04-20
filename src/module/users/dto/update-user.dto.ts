import { PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

// Ele já herda email, name e password como opcionais aqui!
export class UpdateUserDto extends PartialType(CreateUserDto) {}
