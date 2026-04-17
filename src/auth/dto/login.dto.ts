import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from "class-validator";

export class LoginDto {
  @IsEmail({}, { message: "Email inválido" })
  @IsNotEmpty({ message: "Email é obrigatório" })
  email!: string;

  @IsString({ message: "Senha deve ser texto" })
  @MinLength(8, { message: "Senha deve ter no mínimo 8 caracteres" })
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      "Senha deve conter pelo menos 1 letra maiúscula, 1 minúscula e 1 número",
  })
  @IsNotEmpty({ message: "Senha é obrigatória" })
  password!: string;
}
