import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

// Ele já herda email, name e password como opcionais aqui!
export class UpdateUserDto extends PartialType(CreateUserDto) {}
