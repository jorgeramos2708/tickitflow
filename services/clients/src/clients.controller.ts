import {
  Body,
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JwtGuard } from "./jwt.guard";
import { ClientEntity, toDto, type ClientDto } from "./client.entity";
import { CreateClientDto, UpdateClientDto } from "./dtos";

/** La gestión de clientes es de la consola: agentes y admins. */
function requireOperator(req: Request): void {
  const role = (req as unknown as { user?: { role?: string } }).user?.role;
  if (role !== "agente" && role !== "admin" && role !== "supervisor") {
    throw new ForbiddenException(
      "Los clientes se gestionan desde la consola de soporte",
    );
  }
}

/** Solo agentes y admins escriben; supervisores leen. */
function requireAdmin(req: Request): void {
  const role = (req as unknown as { user?: { role?: string } }).user?.role;
  if (role !== "agente" && role !== "admin") {
    throw new ForbiddenException(
      "Solo un agente o administrador puede modificar clientes",
    );
  }
}

/** Salud del servicio — pública, para monitoreo del stack. */
@Controller("health")
export class HealthController {
  @Get()
  health() {
    return { status: "ok", service: "clients" };
  }
}

@Controller()
@UseGuards(JwtGuard)
export class ClientsController {
  constructor(
    @InjectRepository(ClientEntity)
    private readonly clients: Repository<ClientEntity>,
  ) {}

  @Get("clients")
  async list(
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
    @Req() req?: Request,
  ): Promise<ClientDto[]> {
    requireOperator(req as Request);
    const take = Math.min(Number(limit ?? 200) || 200, 500);
    const skip = Math.max(Number(offset ?? 0) || 0, 0);
    const rows = await this.clients.find({
      order: { createdAt: "DESC" },
      take,
      skip,
    });
    return rows.map(toDto);
  }

  @Get("clients/:code")
  async byCode(@Param("code") code: string): Promise<ClientDto> {
    const client = await this.clients.findOne({ where: { code } });
    if (!client) throw new NotFoundException("Cliente no encontrado");
    return toDto(client);
  }

  @Post("clients")
  async create(
    @Body() body: CreateClientDto,
    @Req() req: Request,
  ): Promise<ClientDto> {
    requireAdmin(req);
    if (!body.name?.trim()) {
      throw new BadRequestException("El nombre es obligatorio");
    }
    // Código CLI-1001… derivado de la secuencia (idempotente bajo retry
    // del cliente porque el server es la fuente)
    const all = await this.clients.find();
    let maxNum = 1000;
    for (const c of all) {
      const n = Number(c.code.split("-")[1]);
      if (n > maxNum) maxNum = n;
    }
    const now = new Date();
    const client = await this.clients.save(
      this.clients.create({
        code: `CLI-${maxNum + 1}`,
        name: body.name.trim(),
        type: body.type,
        email: body.email?.trim() ?? "",
        phone: body.phone?.trim() ?? "",
        company: body.company?.trim() ?? "",
        notes: body.notes?.trim() ?? "",
        createdAt: now,
        updatedAt: now,
      }),
    );
    return toDto(client);
  }

  @Patch("clients/:code")
  async patch(
    @Param("code") code: string,
    @Body() body: UpdateClientDto,
    @Req() req: Request,
  ): Promise<ClientDto> {
    requireAdmin(req);
    const client = await this.clients.findOne({ where: { code } });
    if (!client) throw new NotFoundException("Cliente no encontrado");
    if (body.name !== undefined) {
      if (!body.name.trim()) throw new BadRequestException("El nombre es obligatorio");
      client.name = body.name.trim();
    }
    if (body.type !== undefined) client.type = body.type;
    if (body.email !== undefined) client.email = body.email.trim();
    if (body.phone !== undefined) client.phone = body.phone.trim();
    if (body.company !== undefined) client.company = body.company.trim();
    if (body.notes !== undefined) client.notes = body.notes.trim();
    client.updatedAt = new Date();
    await this.clients.save(client);
    return toDto(client);
  }
}
