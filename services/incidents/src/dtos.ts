import { Type } from "class-transformer";
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import type { Practice, Priority, TicketStatus } from "./ticket.entity";

export class AttachmentMetaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsInt()
  @Min(0)
  @Max(1_048_576)
  sizeKb!: number;
}

export class CreateTicketDto {
  @IsIn(["incidente", "requerimiento"], {
    message: "Práctica no válida",
  })
  practice!: Practice;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  subject!: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  description?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  requester!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  dept!: string;

  @IsIn(["P1", "P2", "P3", "P4"], { message: "Prioridad no válida" })
  priority!: Priority;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentMetaDto)
  attachments?: AttachmentMetaDto[];
}

export class PatchTicketDto {
  @IsOptional()
  @IsIn(
    [
      "nuevo",
      "asignado",
      "en_progreso",
      "pendiente_usuario",
      "resuelto",
      "cerrado",
      "cancelado",
    ],
    { message: "Estado no válido" },
  )
  status?: TicketStatus;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  assignee?: string;

  @IsOptional()
  @IsIn(["P1", "P2", "P3", "P4"], { message: "Prioridad no válida" })
  priority?: Priority;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  actor?: string;
}
