# VisibleParaRolesDirective

`*appVisibleParaRoles` monta un bloque únicamente cuando el rol activo pertenece a la lista permitida.

```html
<app-resumen-financiero *appVisibleParaRoles="['ADMIN']" />
```

La comparación usa `AuthService.obtenerRolUsuario()`: si una persona tiene varios roles, solo se
considera el rol seleccionado para el contexto actual. Al cambiar de rol se navega a su área y la
vista se reconstruye con el nuevo contexto.

La directiva evita instanciar los componentes ocultos y, por lo tanto, evita que sus constructores
inicien consultas. Es una herramienta de composición visual; no reemplaza los guards de rutas ni la
autorización del backend.
