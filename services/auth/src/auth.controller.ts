import { Throttle, SkipThrottle } from "@nestjs/throttler";
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { AuthService } from "./auth.service";
import { JwtGuard } from "./jwt.guard";
import {
  ChangePasswordDto,
  CreateUserDto,
  LoginDto,
  UpdateUserDto,
} from "./dtos";

@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("login")
  @Throttle({ login: { limit: 5, ttl: 900_000 } })
  async login(
    @Body() body: LoginDto,
  ): Promise<{ token: string; user: { email: string; name: string; role: string } }> {
    const { email, password } = body ?? {};
    if (!email || !password) {
      throw new UnauthorizedException("Credenciales no válidas");
    }
    return this.auth.login(email, password);
  }

  @Get("me")
  @UseGuards(JwtGuard)
  async me(@Req() req: Request) {
    const email = (req as unknown as { user?: { email?: string } }).user?.email;
    if (!email) throw new UnauthorizedException();
    return this.auth.me(email);
  }

  @Get("users")
  @UseGuards(JwtGuard)
  async listUsers(@Req() req: Request) {
    // RBAC: admin y supervisor ven el directorio; solo admin escribe
    const role =
      (req as unknown as { user?: { role?: string } }).user?.role ?? "";
    if (role !== "admin" && role !== "supervisor") {
      throw new UnauthorizedException("Solo administradores o supervisores pueden listar usuarios");
    }
    return this.auth.listUsers();
  }

  @Post("users")
  @UseGuards(JwtGuard)
  async createUser(
    @Body() body: CreateUserDto,
    @Req() req: Request,
  ) {
    const actorRole =
      (req as unknown as { user?: { role?: string } }).user?.role ?? "";
    if (actorRole !== "admin") {
      throw new UnauthorizedException("Solo un administrador puede crear usuarios");
    }
    return this.auth.createUser(body);
  }

  @Patch("users/:email")
  @UseGuards(JwtGuard)
  async updateUser(
    @Param("email") email: string,
    @Body() body: UpdateUserDto,
    @Req() req: Request,
  ) {
    const actorRole =
      (req as unknown as { user?: { role?: string } }).user?.role ?? "";
    if (actorRole !== "admin") {
      throw new UnauthorizedException("Solo un administrador puede editar usuarios");
    }
    return this.auth.updateUser(email, body);
  }

  @Put("users/:email/password")
  @UseGuards(JwtGuard)
  async changePassword(
    @Param("email") email: string,
    @Body() body: ChangePasswordDto,
    @Req() req: Request,
  ) {
    const actorEmail =
      (req as unknown as { user?: { email?: string } }).user?.email ?? "";
    // Un usuario solo cambia su propia contraseña; un admin puede cambiar cualquiera
    if (actorEmail !== email) {
      const actorRole =
        (req as unknown as { user?: { role?: string } }).user?.role ?? "";
      if (actorRole !== "admin") {
        throw new UnauthorizedException("Solo puedes cambiar tu propia contraseña");
      }
    }
    return this.auth.changePassword(email, body.currentPassword, body.newPassword);
  }

  @Get("health")
  health() {
    return { status: "ok", service: "auth" };
  }
}
