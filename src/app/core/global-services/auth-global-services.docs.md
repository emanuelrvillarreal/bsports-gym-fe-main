# Auth Global Services

Esta carpeta contiene la base de autenticacion y sesion del template.

Archivos principales:

- [auth.service.ts](./services/auth.service.ts)
- [auth-session.service.ts](./services/auth-session.service.ts)

## Responsabilidades

### `AuthService`

Se encarga de:

- login
- logout
- refresh token
- rehidratacion de sesion
- obtencion de `userData`
- actualizacion de perfil
- subida, reemplazo y eliminación de la foto del usuario autenticado
- lectura del rol actual
- redireccion segura al cerrar sesion

### `AuthSessionService`

Se encarga de:

- guardar tokens en memoria
- persistir `refreshToken`
- exponer usuario actual en memoria
- limpiar sesion local

## Como Funciona El Flujo

### Login

1. se llama `login(payload)`
2. backend devuelve tokens
3. se normalizan nombres de tokens
4. se guardan con `AuthSessionService`
5. se consulta `userData`
6. se guarda el usuario en memoria

### Refresh

1. el interceptor recibe `401`
2. llama `authService.refrescarAccessToken()`
3. usa el `refreshToken`
4. guarda el nuevo `accessToken`
5. reintenta la request original

Si el refresh falla por red (`0`), `401`, `408`, `429` o `5xx`, se reintenta hasta
dos veces con esperas progresivas de 500 ms y 1.500 ms. Si se agotan los intentos,
la sesiÃ³n se limpia y el interceptor redirige a `/login`. Los errores de contrato
(por ejemplo, una respuesta sin token) no se reintentan.

Si la request original recibe otro `401` despuÃ©s de renovar el access token, la
sesiÃ³n se cierra para evitar un ciclo infinito de refresh.

### Rehidratacion

1. al iniciar la app se llama `rehidratarSesion()`
2. si ya hay usuario cargado, devuelve `true`
3. si no hay `accessToken` pero si `refreshToken`, intenta refresh sin navegar por efecto colateral
4. luego consulta `userData`

## Uso Si El Backend Usa JWT

Esta base ya esta pensada para JWT con `Bearer token`.

Supuestos actuales:

- existe `accessToken`
- existe `refreshToken`
- el backend expone endpoint de refresh
- el backend acepta `Authorization: Bearer <token>`

## Persistencia Actual

Hoy el template persiste:

- `refreshToken` en `sessionStorage`

No persiste:

- `accessToken`
- `userData`

Esto esta hecho asi como solucion puente.

## Recomendacion Senior

Si el backend migra a cookie HttpOnly:

- el `refreshToken` no deberia persistirse en frontend
- `AuthSessionService` deberia simplificarse
- la rehidratacion deberia apoyarse en la cookie del navegador

## Como Usarlo

Login:

```ts
this.authService
  .login({
    dni: '30123456',
    password: 'secreta',
  })
  .subscribe();
```

Logout:

```ts
this.authService.logout().subscribe();
```

Usuario actual:

```ts
const usuario = this.authService.obtenerUsuarioGuardado();
const rol = this.authService.obtenerRolUsuario();
```

El logout elimina credenciales y contexto activo, pero conserva el branding publico del ultimo
club. Logo y nombre se cachean por UUID y se rehidratan en `/login`; si no existe cache, la UI usa
los valores predeterminados del template.

## Alcance

Impacta en:

- guards
- interceptor
- login
- rutas privadas
- sesion global de la app

## Regla Del Template

`AuthService` concentra logica de autenticacion.

`AuthSessionService` concentra estado local de sesion.

No conviene duplicar manejo de tokens en componentes o paginas.
