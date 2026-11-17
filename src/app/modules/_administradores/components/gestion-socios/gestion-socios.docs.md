# GestionSociosComponent

`app-gestion-socios` — administra socios titulares y familiares del club desde una única interfaz compartida por ADMIN y ADM_RECEPCION.

## Uso básico

```typescript
import { Component } from '@angular/core';
import { GestionSociosComponent } from './gestion-socios.component';

@Component({
  selector: 'app-socios-administradores-page',
  imports: [GestionSociosComponent],
  template: '<app-gestion-socios />',
})
export class SociosAdministradoresPageComponent {}
```

## Inputs

| Input                | Tipo     | Default | Descripción                                                     |
| -------------------- | -------- | ------- | --------------------------------------------------------------- |
| `duracionErrorMs`    | `number` | `5000`  | Duración de los errores temporales de formularios.              |
| `filasVisiblesTabla` | `number` | `50`    | Máximo visual antes del scroll; no modifica el paginado remoto. |

## Outputs

El componente no expone outputs; coordina el dominio mediante `SociosApiService`.

## Variantes / Casos de uso avanzados

- “Nuevo titular” se dispara desde el botón `+` de la tabla y abre el formulario en `app-popup`.
- “Agregar familiar” aparece como acción con icono solo en filas titulares y conserva internamente su `memberUuid`.
- “Ver familiares” consulta el grupo mediante el `memberUuid` del titular seleccionado. Se muestra
  azul y habilitado cuando `tieneFamiliares` es `true`; si es `false` o no está informado, permanece
  visible en gris y deshabilitado.
- La primera columna muestra `imageUrl` con el renderer `avatar` de `app-tabla-responsive` y usa iniciales como fallback.
- Ambas tablas muestran `Edad`, calculada desde `fechaNacimiento` como años y meses completos. La tabla principal muestra `fechaAlta` y omite `parentesco`; ese dato se conserva en el detalle de familiares.
- El detalle de familiares reutiliza las acciones de edición, baja y cambio de estado. Al modificar el estado, recarga el grupo para reflejar el valor actualizado.
- “Editar” abre el mismo popup reutilizado y limita el request a los campos admitidos por `MemberBackofficeUpdateCommand`.
- En las altas, `fechaAlta` se completa automáticamente con la fecha local del día y no se solicita en el formulario.
- En las altas administrativas de titular y familiar se carga el catálogo completo de descuentos y se pueden enviar asignaciones recurrentes opcionales junto con el alta. La edición no expone esta sección.
- En “Nuevo familiar”, Parentesco se ubica junto a Fecha de nacimiento y replica las dimensiones del resto de los inputs.
- “Ver certificados” reemplaza la baja lógica tanto en la tabla principal como en la tabla de familiares. Abre un popup con título hero, tabla de hasta cuatro filas visibles y scroll para el resto. Cada certificado permite ver el informe y confirmar o denegar los pendientes; ambas acciones piden validación explícita antes de enviar el cambio. Los certificados confirmados muestran un check verde; los denegados, un chip rojo y una cruz roja.
- “Dar de baja” está disponible para socios `ACTIVO` y permite aplicar `INACTIVO`, `MOROSO`, `INHABILITADO` o `SUSPENDIDO` mediante `PUT /member/uuid/{memberUuid}/estado`. Los demás estados muestran la acción verde “Activo”, que los reactiva directamente; la fila se actualiza con la respuesta del backend.
- Los socios `INACTIVO` muestran chip rojo y fondo de fila rojo suave; `SUSPENDIDO` conserva el chip naranja.
- La carga inicial y las recargas por filtros usan el spinner interno de `app-tabla-responsive`, que conserva el alto reservado de la tabla; el botón Buscar mantiene su feedback propio.
- “Importar socios” se muestra junto a “Nuevo titular” en la cabecera y abre un popup con selector `.xls`/`.xlsx`. El popup permite descargar `assets/plantillas/plantilla-importacion-socios.xlsx` desde la acción “Plantilla”. Tras el `202`, sigue las filas procesadas mediante SSE y muestra debajo de la barra el contador `filasProcesadas/filasTotales`, el porcentaje y los contadores acumulados de errores y advertencias.
- Mientras `EventSource` se reconecta, conserva el último avance. Al recibir `completed`, consulta `GET /member/import/{importId}/result` y presenta tarjetas de totales, filas correctas, errores y advertencias, más un detalle desplazable por fila con tipo, número de socio, UUID, error y warnings.
- La importación pendiente se guarda por empresa en `sessionStorage`. Un F5 o el regreso a la ruta en la misma pestaña reabre el popup y recupera el estado actual sin reenviar el archivo.
- El popup informa las once columnas esperadas y aclara que sus nombres no distinguen mayúsculas de minúsculas.
- La búsqueda y los estados comparten una fila flexible; el paginado usa 20 socios fijos por página.
- “Agrupar familiares” aparece a la izquierda de “Nuevo titular”, está activo por defecto y envía `titular: true` al paginado específico de socios.

## Qué no hacer

- No agregar conversión familiar-titular: ese endpoint no está en Postman.
- No usar este componente fuera de un layout con sesión y empresa seleccionada; todas las operaciones requieren JWT y `X-Company-Uuid`.
- No reemplazar `SociosApiService` por llamadas `HttpClient` desde la page; se perderían los contextos de tenant y toasts.

## Relación con el sistema de diseño

Reutiliza `app-card`, `app-tabla-responsive`, `app-popup`, `app-paginacion`, `app-formulario-filtro-socios`, `app-formulario-gestion-socio`, `app-load-spinner-blue` y el servicio global de toasts. Consume los tokens `--app-*`, `--semantic-success` y `--semantic-danger`, y responde a los temas claro/oscuro.

## Notas técnicas

- Endpoints: `POST /member/paginate`, `GET /member/uuid/{memberUuid}/familiares`, `POST /member/titular`, `POST /member/familiar`, `PUT /member/uuid/{memberUuid}`, `POST /member/uuid/{memberUuid}/baja`, `PUT /member/uuid/{memberUuid}/estado`, `POST /member/import`, `GET /member/import/{importId}/progress` y `POST /descuento/catalogo/paginate` para las opciones del alta.
- Roles/rutas consumidoras: ADMIN en `/admin/socios` y ADM_RECEPCION en `/adm-recepcion/socios`; los permisos efectivos los valida el backend.
- Errores relevantes: validaciones `400`, permisos `403` y conflictos de usuarios/socios `409`.
- Campos excluidos deliberadamente de la edición: `estado`, `imageUrl` y cualquier conversión. El estado se modifica mediante su operación específica; `imageUrl` se consume solo para mostrar la foto.
- El paginado es 1-based, solicita 20 socios por página y reinicia a página 1 cuando cambian la búsqueda o los estados.
- Los formularios no se cierran al pulsar el backdrop ni Escape; el cierre explícito se hace con “Cancelar”.
- El SSE usa `EventSource` sin headers custom. La suscripción se cierra al completar, abortar o destruir el componente; destruirlo conserva el registro de `sessionStorage` para permitir reconexión.
