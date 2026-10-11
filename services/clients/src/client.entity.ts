import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

/** Interno: empleado/área de la organización. Externo: cliente/proveedor. */
export type ClientType = "interno" | "externo";

@Entity("clients")
export class ClientEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  code!: string;

  @Column()
  name!: string;

  @Column()
  type!: ClientType;

  /** Correo de contacto */
  @Column({ default: "" })
  email!: string;

  /** Teléfono de contacto */
  @Column({ default: "" })
  phone!: string;

  /** Empresa (externos) o área/departamento (internos) */
  @Column({ default: "" })
  company!: string;

  /** Notas de contexto */
  @Column({ default: "" })
  notes!: string;

  @Column({ type: "timestamptz", name: "created_at" })
  createdAt!: Date;

  @Column({ type: "timestamptz", name: "updated_at" })
  updatedAt!: Date;
}

export interface ClientDto {
  id: number;
  code: string;
  name: string;
  type: ClientType;
  email: string;
  phone: string;
  company: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export function toDto(c: ClientEntity): ClientDto {
  return {
    id: c.id,
    code: c.code,
    name: c.name,
    type: c.type,
    email: c.email,
    phone: c.phone,
    company: c.company,
    notes: c.notes,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}
