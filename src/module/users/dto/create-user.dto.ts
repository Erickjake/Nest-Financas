export class CreateUserDto {
  email!: string; // O '!' diz que ela será preenchida depois
  name!: string; // O '?' já resolve porque diz que pode ser undefined
  password!: string;
}
