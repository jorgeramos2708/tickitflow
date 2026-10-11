import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { ClientsController } from "./clients.controller";
import type { ClientEntity } from "./client.entity";
import { toDto, type ClientDto } from "./client.entity";

const baseDto: ClientDto = {
  id: 1,
  code: "CLI-1001",
  name: "M. Aguilar",
  type: "interno",
  email: "m.aguilar@tickitflow.dev",
  phone: "ext. 204",
  company: "Finanzas",
  notes: "",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function makeClient(overrides: Partial<ClientEntity> = {}): ClientEntity {
  const now = new Date();
  return {
    id: 1,
    code: "CLI-1001",
    name: "M. Aguilar",
    type: "interno",
    email: "m.aguilar@tickitflow.dev",
    phone: "ext. 204",
    company: "Finanzas",
    notes: "",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as ClientEntity;
}

function makeController(client: ClientEntity | null) {
  const saved: ClientEntity[] = [];
  const repo = {
    findOne: async () => client,
    find: async () => (client ? [client] : []),
    save: async (c: ClientEntity) => {
      saved.push(c);
      return c;
    },
    create: (data: Partial<ClientEntity>) => makeClient(data),
  };
  const controller = new ClientsController(repo as never);
  return { controller, saved, repo };
}

function reqWith(role?: string) {
  return { user: role ? { name: "Jorge Ramos", role } : undefined } as never;
}

describe("ClientsController — RBAC", () => {
  it("agente puede listar", async () => {
    const { controller } = makeController(makeClient());
    const rows = await controller.list(undefined, undefined, reqWith("agente"));
    expect(rows).toHaveLength(1);
    expect(rows[0].type).toBe("interno");
  });

  it("usuario de portal NO lista (403)", async () => {
    const { controller } = makeController(makeClient());
    await expect(controller.list(undefined, undefined, reqWith("usuario")))
      .rejects.toThrow(ForbiddenException);
  });

  it("supervisor puede listar pero NO crear (solo agente/admin escriben)", async () => {
    const { controller } = makeController(null);
    await expect(
      controller.create(
        { name: "Nuevo", type: "externo" } as never,
        reqWith("supervisor"),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it("agente crea cliente externo con código CLI-N", async () => {
    const { controller, saved } = makeController(null);
    const dto = await controller.create(
      { name: "Proveedor XYZ", type: "externo", email: "x@y.z" } as never,
      reqWith("agente"),
    );
    expect(dto.code).toMatch(/^CLI-\d+$/);
    expect(dto.type).toBe("externo");
    expect(saved).toHaveLength(1);
  });

  it("agente edita nombre y tipo; usuario NO (403)", async () => {
    const { controller } = makeController(makeClient());
    const dto = await controller.patch(
      "CLI-1001",
      { name: "M. Aguilar Jr.", type: "externo" } as never,
      reqWith("agente"),
    );
    expect(dto.name).toBe("M. Aguilar Jr.");
    expect(dto.type).toBe("externo");

    const c2 = makeController(makeClient());
    await expect(
      c2.controller.patch("CLI-1001", { name: "hack" } as never, reqWith("usuario")),
    ).rejects.toThrow(ForbiddenException);
  });

  it("inexistente → NotFoundException", async () => {
    const { controller } = makeController(null);
    await expect(controller.byCode("CLI-9999")).rejects.toThrow(NotFoundException);
  });
});

describe("toDto", () => {
  it("serializa fechas ISO y campos completos", () => {
    const dto = toDto(makeClient());
    expect(dto.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(dto.company).toBe("Finanzas");
  });
});
