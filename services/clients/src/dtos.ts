import { Type } from "class-transformer";
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateClientDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name!: string;

  @IsIn(["interno", "externo"], { message: "Tipo no válido" })
  type!: "interno" | "externo";

  @IsOptional()
  @IsEmail({}, { message: "Email no válido" })
  @MaxLength(160)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  /** Empresa (externos) o área/departamento (internos) */
  @IsOptional()
  @IsString()
  @MaxLength(160)
  company?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class UpdateClientDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsIn(["interno", "externo"], { message: "Tipo no válido" })
  type?: "interno" | "externo";

  @IsOptional()
  @IsEmail({}, { message: "Email no válido" })
  @MaxLength(160)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  company?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

// Re-export para el guard de tipos en el controlador
export { Type };
