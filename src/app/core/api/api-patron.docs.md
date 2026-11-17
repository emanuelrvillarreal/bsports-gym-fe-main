# Patrón de servicios API

Guía para crear un servicio HTTP en apps derivadas del template.

## Piezas del núcleo

| Pieza        | Ubicación                                 | Rol                                         |
| ------------ | ----------------------------------------- | ------------------------------------------- |
| Rutas        | `api-routes.ts`                           | Paths relativos al `apiBaseUrl`             |
| URL          | `api-url.ts`                              | Helper `crearApiUrl()` que normaliza barras |
| Paginación   | `interfaces/paginate.interface.ts`        | Contrato compartido `PageResponse<T>`       |
| Interceptors | `core/interceptors/`                      | Auth, company UUID, toasts                  |
| Ejemplo      | `services/ejemplo-entidad-api.service.ts` | Copiar como plantilla                       |

## Pasos para un nuevo dominio (ej. `Producto`)

### 1. Agregar rutas en `api-routes.ts`

```typescript
productos: {
  paginar: 'productos/paginate',
  guardar: 'productos/save',
  eliminar: (uuid: string) => `productos/${uuid}`,
},
```

### 2. Crear interfaces

Archivo: `interfaces/producto.interfaces.ts`

- DTO de lectura (`ProductoApiDto`)
- Payload de escritura (`ProductoFormPayload`)
- Request paginado específico con los campos planos del Postman
- `ProductoPaginateResponse = PageResponse<ProductoApiDto>` sólo si el endpoint devuelve Spring Page

### 3. Crear el servicio

Usar `ejemplo-entidad-api.service.ts` sólo como referencia de infraestructura. Los métodos y payloads deben salir del request Postman del dominio:

- `EjemploEntidadApiService` → `ProductosApiService`
- `API_ROUTES.ejemploEntidad` → `API_ROUTES.productos`
- Tipos de interfaces propias

### 4. Contexto HTTP (interceptors)

Patrón usado en el template:

```typescript
private crearContextoCompany(): HttpContext {
  const companyUuid = this.authSessionService.obtenerCompanyUuid();
  return companyUuid
    ? conCompanyUuid(new HttpContext(), companyUuid)
    : new HttpContext();
}
```

Para mutaciones con feedback al usuario:

```typescript
context: this.crearContextoCompany()
  .set(MOSTRAR_TOAST_EXITO, { titulo: 'Productos' })
  .set(MOSTRAR_TOAST_ERROR, { titulo: 'Productos' }),
```

Toda mutacion que envie un DTO debe configurar `MOSTRAR_TOAST_ERROR`, salvo que
el contenedor conserve el error en su propia UI. En esa excepcion, el contenedor
debe usar `extraerMensajeErrorApi()` para respetar el mismo contrato de errores
por campo y no duplicar la interpretacion del backend.

Para endpoints públicos (sin JWT):

```typescript
import { OMITIR_AUTH } from '../../interceptors/context/auth-context';

new HttpContext().set(OMITIR_AUTH, true);
```

### 5. Consumir desde una page

```typescript
private readonly productosApi = inject(ProductosApiService);

readonly filas = signal<ProductoApiDto[]>([]);

ngOnInit(): void {
  this.productosApi.listar({ page: 1, size: 20 }).subscribe((resp) => {
    this.filas.set([...resp.content]);
  });
}
```

## Auth (ya incluido)

`AuthService` usa `API_ROUTES.auth.*`. No duplicar lógica de login/refresh en servicios de dominio.

## Paginación

No copiar `PaginateRequest` genérico a los módulos de Clubes. Socios, profesores, recepcionistas y actividades usan DTOs planos diferentes. Revisar `.agents/paginado-core.md` y Postman antes de tipar cada request.

## Cola serializada (opcional)

Si necesitás evitar race conditions en listados (filtros rápidos, búsqueda con debounce), serializá las llamadas `listar` en el servicio (cola FIFO) antes de emitir al componente. Para las reglas de paginado del proyecto, revisá [paginado-core.md](../../../../.agents/paginado-core.md) y el contrato Postman del dominio.

## Checklist

- [ ] Rutas en `API_ROUTES`
- [ ] Interfaces tipadas
- [ ] Servicio con `providedIn: 'root'`
- [ ] `crearApiUrl()` desde `api-url.ts`
- [ ] Contexto company / auth según corresponda
- [ ] Page/container inyecta el servicio (no HttpClient directo)
