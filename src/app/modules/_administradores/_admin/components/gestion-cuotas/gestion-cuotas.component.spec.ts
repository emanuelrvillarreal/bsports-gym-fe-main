import { ComponentFixture, TestBed } from "@angular/core/testing";
import { signal } from "@angular/core";
import { of, throwError } from "rxjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CuotaDetalleDto } from "../../../../../core/api/interfaces/tesoreria.interfaces";
import { TesoreriaApiService } from "../../../../../core/api/services/tesoreria-api.service";
import { ColorThemeService } from "../../../../ui/color-mod/color-theme.service";
import { ThemeModeService } from "../../../../ui/dark-mode/theme-mode.service";
import { ToastAlertService } from "../../../../ui/toast-alert/services/toast-alert.service";
import { GestionCuotasComponent } from "./gestion-cuotas.component";
import { MercadoPagoCheckoutService } from "../../../../pagos/services/mercado-pago-checkout.service";
import { AuthSessionService } from "../../../../../core/global-services/services/auth-session.service";

const cuotaAnulada: CuotaDetalleDto = {
  cuotaUuid: "cuota-1",
  concepto: "Cuota social",
  tipo: "SOCIAL",
  origen: "CICLO_MENSUAL",
  monto: 10000,
  montoFinal: 15000,
  vencimiento: "2026-07-10",
  estado: "ANULADA",
  diasMora: 0,
  personaMemberUuid: "socio-1",
  personaNombre: "Ana",
  personaApellido: "Pérez",
  personaEstado: "ACTIVO",
  titularMemberUuid: "socio-1",
  titularNombre: "Ana",
  titularApellido: "Pérez",
  fechaGeneracion: '01/07/2026',
  anuladaPorUuid: "admin-1",
  anuladaPorNombre: "María",
  anuladaPorApellido: "González",
  anuladaMotivo: "Cuota duplicada",
  anuladaAt: "2026-07-24T12:00:00Z",
};

describe("GestionCuotasComponent", () => {
  let fixture: ComponentFixture<GestionCuotasComponent>;
  let iniciarCobroMercadoPago: ReturnType<typeof vi.fn>;
  let generarQr: ReturnType<typeof vi.fn>;
  let confirmar: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    iniciarCobroMercadoPago = vi.fn(() =>
      of({
        mercadoPagoInitPoint: "https://www.mercadopago.com.ar/checkout",
        mercadoPagoPreferenceId: "preferencia-1",
      }),
    );
    generarQr = vi.fn(() => Promise.resolve("data:image/png;base64,qr"));
    confirmar = vi.fn(() => Promise.resolve(false));
    await TestBed.configureTestingModule({
      imports: [GestionCuotasComponent],
      providers: [
        {
          provide: TesoreriaApiService,
          useValue: {
            paginarCuotas: () =>
              of({ content: [], totalElements: 0, totalPages: 0 }),
            cobrarManual: () => of({ items: [], exitosas: 0, fallidas: 0 }),
            iniciarCobroMercadoPago,
          },
        },
        {
          provide: MercadoPagoCheckoutService,
          useValue: {
            normalizarEnlace: (enlace: string) => enlace,
            generarQr,
            copiarEnlace: vi.fn(() => Promise.resolve(true)),
            abrirCheckout: vi.fn(() => true),
          },
        },
        { provide: ToastAlertService, useValue: { confirm: confirmar } },
        {
          provide: AuthSessionService,
          useValue: {
            obtenerCompanyUuid: () => "club-1",
            obtenerCompanyName: () => "Club Norte",
            obtenerUsuario: () => ({
              userCompanyRoles: [
                {
                  companyUuid: "club-1",
                  companyName: "Club Norte",
                  emailInstitucional: "info@clubnorte.com",
                  telefono: "11 4444-5555",
                  roles: [
                    {
                      name: "ADMIN",
                      permissions: [{ name: "treasury.notify_delinquent" }],
                    },
                  ],
                },
              ],
            }),
          },
        },
        {
          provide: ThemeModeService,
          useValue: { resolvedMode: signal<"dark" | "light">("dark") },
        },
        {
          provide: ColorThemeService,
          useValue: {
            colorPrimario: signal("#4982fd"),
            colorSecundario: signal("#2563eb"),
            colorTerciario: signal("#06b6d4"),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GestionCuotasComponent);
    fixture.detectChanges();
  });

  it("muestra la auditoría al consultar una cuota anulada", () => {
    fixture.componentInstance["detalle"].set(cuotaAnulada);
    fixture.detectChanges();

    const detalle = (fixture.nativeElement as HTMLElement).textContent ?? "";

    expect(detalle).toContain("Anulada por");
    expect(detalle).toContain("María González");
    expect(detalle).not.toContain("admin-1");
    expect(detalle).toContain("Cuota duplicada");
    expect(detalle).toContain("2026-07-24T12:00:00Z");
    expect(fixture.nativeElement.querySelector(".detalle__importe del")).not.toBeNull();
    expect(fixture.nativeElement.querySelector(".detalle__importe strong")?.textContent).toContain(
      "$15000",
    );
  });

  it("incluye días de mora y monto final en la tabla", () => {
    const columnas = fixture.componentInstance["columnas"];
    const idsColumnas = columnas.map((columna) => columna.id);

    expect(columnas.some((columna) => columna.id === "diasMora")).toBe(true);
    expect(idsColumnas).toContain("montoFinal");
    expect(idsColumnas.indexOf("monto")).toBeLessThan(
      idsColumnas.indexOf("montoFinal"),
    );
    expect(columnas.some((columna) => columna.id === "origen")).toBe(false);
    expect(
      columnas
        .find((columna) => columna.id === "monto")
        ?.celdaClase?.(10000, {
          montoFinal: 5000,
        } as never),
    ).toBe("tabla-responsive__texto--monto-reemplazado");
  });

  it("cobra desde la fila de una cuota mostrando toda la deuda de esa persona", () => {
    const wizard = { iniciarConSocioDeCuota: vi.fn() };
    const cuota = { cuotaUuid: "c-1", concepto: "Cuota social", monto: 1000 } as never;

    fixture.componentInstance["abrirCobroCuota"](cuota, wizard as never);

    expect(wizard.iniciarConSocioDeCuota).toHaveBeenCalledWith(cuota);
    expect(fixture.componentInstance["popupNuevoCobroAbierto"]()).toBe(true);
  });

  it("abre el wizard desde la acción nativa Nuevo cobro", () => {
    expect(fixture.componentInstance["accionesCabecera"]).toEqual([
      { id: "nuevo-cobro", texto: "Nuevo cobro", abreDialogo: true },
    ]);

    fixture.componentInstance["manejarAccionCabecera"]("nuevo-cobro");

    expect(fixture.componentInstance["popupNuevoCobroAbierto"]()).toBe(true);
  });

  it("habilita el recordatorio solo para una cuota vencida con permiso", () => {
    const componente = fixture.componentInstance;
    const cuota = {
      ...cuotaAnulada,
      estado: "VENCIDA" as const,
      titularEmail: null,
      titularTelefono: null,
      persona: "Ana Pérez",
      titular: "Ana Pérez",
    };

    componente["abrirNotificacion"](cuota);

    expect(componente["puedeNotificarMorosos"]()).toBe(true);
    expect(componente["cuotaNotificacion"]()).toEqual(cuota);
  });

  it("mantiene pendiente en amarillo y pinta vencida en naranja", () => {
    const columnaEstado = fixture.componentInstance["columnas"].find(
      (columna) => columna.id === "estado",
    );

    expect(columnaEstado?.estadoClase?.("PENDIENTE", {} as never)).toBe(
      "tabla-responsive__estado--debe",
    );
    expect(columnaEstado?.estadoClase?.("VENCIDA", {} as never)).toBe(
      "tabla-responsive__estado--vencida",
    );
  });

  it("abre WhatsApp con el mensaje codificado", () => {
    const abrirVentana = vi.spyOn(window, "open").mockReturnValue(null);

    fixture.componentInstance["abrirCanalNotificacion"]({
      canal: "WHATSAPP",
      destinatario: "5491112345678",
      asunto: "Recordatorio",
      mensaje: "Hola Ana & familia",
    });

    expect(abrirVentana).toHaveBeenCalledWith(
      "https://wa.me/5491112345678?text=Hola%20Ana%20%26%20familia",
      "_blank",
      "noopener,noreferrer",
    );
  });
});
