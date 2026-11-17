# LayoutProfesorComponent

`app-layout-profesor` es el shell privado del rol canónico `PROFESOR`.

Usa el prefijo `/profesor`; sus pages viven en `modules/_profesores/pages/`. El acceso se declara con guards de rol y `data.roles: ['PROFESOR']`.

No expone inputs ni outputs. Compone `LayoutMainComponent` y reutiliza su navegación, header, temas y comportamiento responsive.

No usar el alias histórico `INSTRUCTOR`, crear otro nav-bar ni consumir endpoints desde el layout.
