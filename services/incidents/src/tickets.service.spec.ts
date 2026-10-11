import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { TicketsService } from "./tickets.service";
import { TicketEntity } from "./ticket.entity";

jest.mock("./bus", () => ({ publishEvent: jest.fn() }));

function makeTicket(overrides: Partial<TicketEntity> = {}): TicketEntity {
  const now = new Date();
  return {
    id: 1,
    code: "INC-2401",
    practice: "incidente",
    subject: "Prueba",
    description: "desc",
    requester: "M. Aguilar",
    dept: "Finanzas",
    priority: "P3",
    status: "nuevo",
    assignee: null,
    createdAt: now,
    updatedAt: now,
    resolvedAt: null,
    attachments: [],
    ...overrides,
  } as TicketEntity;
}

function makeService(ticket: TicketEntity | null) {
  const ticketsRepo = {
    findOne: async () => ticket,
    save: async (t: TicketEntity) => t,
  };
  const savedEvents: Array<Record<string, unknown>> = [];
  const eventsRepo = {
    save: async (e: Record<string, unknown>) => {
      savedEvents.push(e);
      return e;
    },
    find: async () => savedEvents,
  };
  return new TicketsService(ticketsRepo as never, eventsRepo as never);
}

/**
 * Repositorio con soporte de la transacción de create():
 * manager.transaction(cb) + getRepository con create/save/update/findOne.
 * Los fallos del save propagan (rollback simulado: nada se persiste).
 */
function makeTransactionalService(opts: { id?: number; failOnSave?: boolean } = {}) {
  let nextId = opts.id ?? 7;
  const persisted: TicketEntity[] = [];
  const row = (partial: Partial<TicketEntity>) =>
    ({ ...makeTicket(), attachments: [], ...partial }) as TicketEntity;

  const emRepo = {
    create: (data: Partial<TicketEntity>) => row(data),
    save: async (entity: TicketEntity) => {
      if (opts.failOnSave) throw new Error("simulated db failure");
      entity.id = nextId++;
      persisted.push(entity);
      return entity;
    },
    update: async (id: number, patch: Partial<TicketEntity>) => {
      const found = persisted.find((t) => t.id === id);
      if (found) Object.assign(found, patch);
    },
    findOne: async ({ where }: { where: { id: number } }) =>
      persisted.find((t) => t.id === where.id) ?? null,
  };
  const ticketsRepo = {
    target: TicketEntity,
    manager: {
      transaction: async (cb: (em: unknown) => Promise<unknown>) =>
        cb({ getRepository: () => emRepo }),
    },
  };
  const savedEvents: Array<Record<string, unknown>> = [];
  const eventsRepo = {
    save: async (e: Record<string, unknown>) => {
      savedEvents.push(e);
      return e;
    },
    find: async () => savedEvents,
  };
  const service = new TicketsService(
    ticketsRepo as never,
    eventsRepo as never,
  );
  return { service, persisted, savedEvents };
}

describe("TicketsService — transiciones", () => {
  it("permite nuevo → en_progreso", async () => {
    const service = makeService(makeTicket());
    const result = await service.patch(
      "INC-2401",
      { status: "en_progreso" },
      "Jorge Ramos",
      "agente",
    );
    expect(result.status).toBe("en_progreso");
  });

  it("permite nuevo → asignado (workflow nuevo)", async () => {
    const service = makeService(makeTicket());
    const result = await service.patch(
      "INC-2401",
      { status: "asignado", assignee: "Ana Bustamante" },
      "Jorge Ramos",
      "agente",
    );
    expect(result.status).toBe("asignado");
    expect(result.assignee).toBe("Ana Bustamante");
  });

  it("asignado → en_progreso permitido; asignado → resuelto bloqueado", async () => {
    const service = makeService(makeTicket({ status: "asignado" }));
    const ok = await service.patch(
      "INC-2401",
      { status: "en_progreso" },
      "Jorge",
      "agente",
    );
    expect(ok.status).toBe("en_progreso");

    const blocked = makeService(makeTicket({ status: "asignado" }));
    await expect(
      blocked.patch("INC-2401", { status: "resuelto" }, "Jorge", "agente"),
    ).rejects.toThrow(ForbiddenException);
  });

  it("nuevo → cancelado permitido (spam/duplicado)", async () => {
    const service = makeService(makeTicket());
    const result = await service.patch(
      "INC-2401",
      { status: "cancelado" },
      "Jorge",
      "agente",
    );
    expect(result.status).toBe("cancelado");
  });

  it("permite en_progreso → resuelto y fija resolvedAt", async () => {
    const service = makeService(makeTicket({ status: "en_progreso" }));
    const result = await service.patch(
      "INC-2401",
      { status: "resuelto" },
      "Jorge Ramos",
      "agente",
    );
    expect(result.status).toBe("resuelto");
    expect(result.resolvedAt).not.toBeNull();
  });

  it("rechaza saltos de estado (nuevo → resuelto)", async () => {
    const service = makeService(makeTicket());
    await expect(
      service.patch("INC-2401", { status: "resuelto" }, "Jorge", "agente"),
    ).rejects.toThrow(ForbiddenException);
  });

  it("en espera NO se resuelve mágicamente: pendiente_usuario → resuelto bloqueado (regla 4)", async () => {
    const service = makeService(makeTicket({ status: "pendiente_usuario" }));
    await expect(
      service.patch("INC-2401", { status: "resuelto" }, "Jorge", "agente"),
    ).rejects.toThrow(ForbiddenException);
  });

  it("resuelto → en_progreso permitido (reapertura manual del agente)", async () => {
    const service = makeService(makeTicket({ status: "resuelto" }));
    const result = await service.patch(
      "INC-2401",
      { status: "en_progreso" },
      "Jorge",
      "agente",
    );
    expect(result.status).toBe("en_progreso");
  });

  it("cerrado es terminal: cualquier cambio bloqueado", async () => {
    const service = makeService(makeTicket({ status: "cerrado" }));
    await expect(
      service.patch("INC-2401", { status: "en_progreso" }, "Jorge", "agente"),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      service.patch("INC-2401", { note: "x" }, "Jorge", "agente"),
    ).rejects.toThrow(ForbiddenException);
  });

  it("cancelado es terminal: cualquier cambio bloqueado", async () => {
    const service = makeService(makeTicket({ status: "cancelado" }));
    await expect(
      service.patch("INC-2401", { status: "en_progreso" }, "Jorge", "agente"),
    ).rejects.toThrow(ForbiddenException);
  });
});

describe("TicketsService — separación de roles", () => {
  it("usuario puede agregar nota en SU ticket", async () => {
    const service = makeService(makeTicket({ requester: "M. Aguilar" }));
    const result = await service.patch(
      "INC-2401",
      { note: "sigue fallando" },
      "M. Aguilar",
      "usuario",
    );
    expect(result.events.some((e) => e.kind === "nota")).toBe(true);
  });

  it("usuario NO puede cambiar estado de su ticket", async () => {
    const service = makeService(makeTicket({ requester: "M. Aguilar" }));
    await expect(
      service.patch("INC-2401", { status: "resuelto" }, "M. Aguilar", "usuario"),
    ).rejects.toThrow(ForbiddenException);
  });

  it("usuario NO puede escribir en ticket ajeno", async () => {
    const service = makeService(makeTicket({ requester: "Otra Persona" }));
    await expect(
      service.patch("INC-2401", { note: "hola" }, "M. Aguilar", "usuario"),
    ).rejects.toThrow(ForbiddenException);
  });

  it("ticket inexistente → NotFoundException", async () => {
    const service = makeService(null);
    await expect(
      service.patch("INC-9999", { note: "x" }, "M. Aguilar", "usuario"),
    ).rejects.toThrow(NotFoundException);
  });
});

describe("TicketsService — reglas de reapertura (workflow nuevo)", () => {
  it("usuario responde a un RESUELTO propio → vuelve automáticamente a en_progreso", async () => {
    const service = makeService(
      makeTicket({ status: "resuelto", requester: "M. Aguilar" }),
    );
    const result = await service.patch(
      "INC-2401",
      { note: "Sigue fallando, no se resolvió" },
      "M. Aguilar",
      "usuario",
    );
    expect(result.status).toBe("en_progreso");
    expect(
      result.events.some(
        (e) => e.kind === "estado" && e.to === "en_progreso" && e.from === "resuelto",
      ),
    ).toBe(true);
  });

  it("la nota de un AGENTE en un resuelto NO reabre", async () => {
    const service = makeService(
      makeTicket({ status: "resuelto", requester: "M. Aguilar" }),
    );
    const result = await service.patch(
      "INC-2401",
      { note: "Nota interna del agente" },
      "Jorge Ramos",
      "agente",
    );
    expect(result.status).toBe("resuelto");
  });

  it("usuario responde a un CERRADO propio → ticket NUEVO vinculado, el original intacto", async () => {
    const closed = makeTicket({
      code: "INC-2450",
      status: "cerrado",
      requester: "M. Aguilar",
      subject: "VPN caída",
    });
    // Mock híbrido: findOne para patch + transaccional para create()
    let nextId = 77;
    const persisted: TicketEntity[] = [];
    const emRepo = {
      create: (data: Partial<TicketEntity>) => ({ ...makeTicket(), ...data }) as TicketEntity,
      save: async (entity: TicketEntity) => {
        entity.id = nextId++;
        persisted.push(entity);
        return entity;
      },
      update: async (id: number, patch: Partial<TicketEntity>) => {
        const found = persisted.find((t) => t.id === id);
        if (found) Object.assign(found, patch);
      },
      findOne: async ({ where }: { where: { id: number } }) =>
        persisted.find((t) => t.id === where.id) ?? null,
    };
    const ticketsRepo = {
      findOne: async () => closed,
      target: TicketEntity,
      manager: {
        transaction: async (cb: (em: unknown) => Promise<unknown>) =>
          cb({ getRepository: () => emRepo }),
      },
    };
    const savedEvents: Array<Record<string, unknown>> = [];
    const eventsRepo = {
      save: async (e: Record<string, unknown>) => {
        savedEvents.push(e);
        return e;
      },
      find: async () => savedEvents,
    };
    const service = new TicketsService(ticketsRepo as never, eventsRepo as never);

    const result = await service.patch(
      "INC-2450",
      { note: "Volvió a pasar lo mismo" },
      "M. Aguilar",
      "usuario",
    );

    // El resultado es el ticket NUEVO derivado, no el original
    expect(result.code).not.toBe("INC-2450");
    expect(result.subject).toBe("Re: INC-2450 — VPN caída");
    expect(result.requester).toBe("M. Aguilar");
    expect(result.status).toBe("nuevo");
    expect(result.description).toContain("Volvió a pasar lo mismo");
    // El original NO fue modificado
    expect(closed.status).toBe("cerrado");
    expect(savedEvents.filter((e) => (e as { ticketId?: number }).ticketId === closed.id)).toHaveLength(0);
  });

  it("usuario responde a un CANCELADO ajeno → 403 (no es su ticket)", async () => {
    const service = makeService(
      makeTicket({ status: "cancelado", requester: "Otra Persona" }),
    );
    await expect(
      service.patch(
        "INC-2401",
        { note: "hola" },
        "M. Aguilar",
        "usuario",
      ),
    ).rejects.toThrow(ForbiddenException);
  });
});

describe("TicketsService — create() transaccional (hallazgo C9)", () => {
  const baseInput = {
    practice: "incidente" as const,
    subject: "VPN caída",
    description: "sin acceso",
    requester: "M. Aguilar",
    dept: "Finanzas",
    priority: "P2" as const,
  };

  it("genera código INC-(2400+id) y nunca expone el TMP", async () => {
    const { service } = makeTransactionalService({ id: 7 });
    const dto = await service.create(baseInput, "Jorge Ramos", "agente");
    expect(dto.code).toBe("INC-2407");
    expect(dto.code).not.toMatch(/TMP/);
  });

  it("requerimiento usa prefijo REQ", async () => {
    const { service } = makeTransactionalService({ id: 3 });
    const dto = await service.create(
      { ...baseInput, practice: "requerimiento" },
      "Jorge Ramos",
      "agente",
    );
    expect(dto.code).toBe("REQ-2403");
  });

  it("description opcional (CreateTicketDto)", async () => {
    const { service } = makeTransactionalService();
    const dto = await service.create(
      { ...baseInput, description: undefined },
      "Jorge Ramos",
      "agente",
    );
    expect(dto.description).toBe("");
  });

  it("subject vacío → BadRequest", async () => {
    const { service } = makeTransactionalService();
    await expect(
      service.create({ ...baseInput, subject: "  " }, "Jorge", "agente"),
    ).rejects.toThrow(BadRequestException);
  });

  it("fallo del save → error propagado, sin fila persistida (rollback)", async () => {
    const { service, persisted, savedEvents } = makeTransactionalService({
      failOnSave: true,
    });
    await expect(
      service.create(baseInput, "Jorge", "agente"),
    ).rejects.toThrow("simulated db failure");
    expect(persisted).toHaveLength(0);
    expect(savedEvents).toHaveLength(0);
  });

  it("evento creado firmado por el requester (no por el actor admin)", async () => {
    const { service, savedEvents } = makeTransactionalService();
    await service.create(baseInput, "Jorge Ramos", "admin");
    const creado = savedEvents.find((e) => e.kind === "creado");
    expect(creado?.actor).toBe("M. Aguilar");
  });
});
