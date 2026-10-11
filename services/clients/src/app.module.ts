import { getJwtSecret } from "./jwt-secret";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { Injectable, Module, OnModuleInit } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { Repository } from "typeorm";
import { ClientEntity, type ClientType } from "./client.entity";
import { ClientsController, HealthController } from "./clients.controller";
import { JwtGuard } from "./jwt.guard";
import { PromMetricsController, HttpMetricsInterceptor } from "./prom.metrics.controller";

type SeedClient = {
  name: string;
  type: ClientType;
  email: string;
  phone: string;
  company: string;
  notes: string;
};

const SEED: SeedClient[] = [
  {
    name: "M. Aguilar",
    type: "interno",
    email: "m.aguilar@tickitflow.dev",
    phone: "ext. 204",
    company: "Finanzas",
    notes: "Solicitante frecuente del portal.",
  },
  {
    name: "L. Cabrera",
    type: "interno",
    email: "l.cabrera@tickitflow.dev",
    phone: "ext. 118",
    company: "Recursos Humanos",
    notes: "",
  },
  {
    name: "D. Espinoza",
    type: "interno",
    email: "d.espinoza@tickitflow.dev",
    phone: "ext. 305",
    company: "Operaciones",
    notes: "Coordinadora de Logística.",
  },
  {
    name: "F. Gallardo",
    type: "interno",
    email: "f.gallardo@tickitflow.dev",
    phone: "ext. 412",
    company: "Ventas",
    notes: "",
  },
  {
    name: "Grupo Vanti C.A.",
    type: "externo",
    email: "soporte@vanti.example",
    phone: "+58 212 555 0100",
    company: "Vanti",
    notes: "Proveedor de infraestructura de red — SLA contractual 8h.",
  },
  {
    name: "Inversiones Meraki",
    type: "externo",
    email: "mesadeayuda@meraki.example",
    phone: "+58 212 555 0200",
    company: "Meraki",
    notes: "Cliente externo con contrato de soporte N2.",
  },
  {
    name: "Suministros Delta",
    type: "externo",
    email: "contacto@delta.example",
    phone: "+58 241 555 0300",
    company: "Delta",
    notes: "Provee consumibles y repuestos de impresión.",
  },
  {
    name: "T. Navarro",
    type: "interno",
    email: "t.navarro@tickitflow.dev",
    phone: "ext. 220",
    company: "Marketing",
    notes: "",
  },
];

/** Siembra de demostración — gated por NODE_ENV/SEED_DEMO como el resto. */
@Injectable()
export class ClientSeeder implements OnModuleInit {
  constructor(
    @InjectRepository(ClientEntity)
    private readonly clients: Repository<ClientEntity>,
  ) {}

  async onModuleInit(): Promise<void> {
    if (
      process.env.NODE_ENV === "production" &&
      process.env.SEED_DEMO !== "true"
    ) {
      return;
    }
    const count = await this.clients.count();
    if (count > 0) return;
    const now = new Date();
    let num = 1000;
    await this.clients.save(
      SEED.map((s) =>
        this.clients.create({
          code: `CLI-${++num}`,
          name: s.name,
          type: s.type,
          email: s.email,
          phone: s.phone,
          company: s.company,
          notes: s.notes,
          createdAt: now,
          updatedAt: now,
        }),
      ),
    );
    console.log("[clients-service] clientes de demostración sembrados");
  }
}

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "postgres",
      url:
        process.env.DATABASE_URL ??
        "postgres://tickit:tickit@localhost:5432/clients",
      entities: [ClientEntity],
      synchronize: false,
      migrations: [__dirname + "/migrations/*.{js,ts}"],
      migrationsRun: true,
    }),
    TypeOrmModule.forFeature([ClientEntity]),
    JwtModule.register({
      secret: getJwtSecret(),
      signOptions: { expiresIn: "8h" },
    }),
  ],
  controllers: [PromMetricsController, ClientsController, HealthController],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: HttpMetricsInterceptor },
    JwtGuard,
    ClientSeeder,
  ],
})
export class AppModule {}
