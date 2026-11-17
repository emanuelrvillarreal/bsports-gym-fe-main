/**
 * Rutas centralizadas del backend.
 *
 * Las rutas se agrupan por dominio. Los segmentos dinamicos se resuelven mediante
 * funciones y los query params se componen en el servicio que realiza la peticion.
 */
export const API_ROUTES = {
  auth: {
    login: 'user/login',
    startLogin: 'user/public/start-login',
    finishLogin: 'user/public/finish-login',
    sessionActual: 'user/login',
    refresh: 'user/refresh-token',
    crearToken: 'user/create-token',
    listarTokens: 'user/tokens',
    eliminarToken: (userAccessTokenUuid: string) => `user/delete-token/${userAccessTokenUuid}`,
    subirFotoPerfil: 'user/photo',
    eliminarFotoPerfil: 'user/photo',
    registrarPublico: 'user/public/register',
    forgotPassword: 'user/public/forgot-password',
    resetPass: 'user/public/change-password',
  },

  /**
   * Endpoints heredados del template que aun tienen consumidores internos.
   * No usar en funcionalidades nuevas: no forman parte del contrato Postman de B Sports Club.
   */
  authTemplateLegado: {
    perfilUsuario: 'user/login',
    agregarFamiliar: 'billing-group/add-member',
  },

  sysadmin: {
    registrarClub: 'sysadmin/clubs',
    sincronizarRoles: 'sysadmin/clubs/sync-roles',
    obtenerPlanesCrm: 'sysadmin/clubs/crm-catalogo/planes',
    obtenerProvinciasCrm: 'sysadmin/clubs/crm-catalogo/provincias',
    obtenerCondicionesImpositivasCrm: 'sysadmin/clubs/crm-catalogo/condiciones-impositivas',
    suscribirEmpresaCrm: (companyUuid: string) => `sysadmin/clubs/${companyUuid}/crm/suscribir`,
    cambiarPlanEmpresaCrm: (companyUuid: string) =>
      `sysadmin/clubs/${companyUuid}/crm/cambiar-plan`,
    desuscribirEmpresaCrm: (companyUuid: string) => `sysadmin/clubs/${companyUuid}/crm/desuscribir`,
    obtenerMercadoPago: (companyUuid: string) => `sysadmin/clubs/${companyUuid}/mercado-pago`,
    guardarMercadoPago: (companyUuid: string) => `sysadmin/clubs/${companyUuid}/mercado-pago`,
  },

  empresas: {
    obtenerContexto: 'companies/context',
    obtenerPublicaPorPath: (path: string) => `companies/public/by-path/${encodeURIComponent(path)}`,
    paginarClubes: 'companies/paginate-club',
    obtenerPerfil: 'companies/current',
    actualizarPerfil: 'companies/profile',
    subirLogo: 'companies/logo',
    eliminarLogo: 'companies/logo',
    menuSolapas: 'companies/menu-solapas',
  },

  administradoresClub: {
    crear: 'admin',
    paginar: 'admin/paginate',
    actualizar: (userUuid: string) => `admin/uuid/${userUuid}`,
  },

  configuraciones: {
    listar: 'configuracion/all',
    obtenerPorClave: (clave: string) => `configuracion/get/${clave}`,
    obtenerPorClaves: 'configuracion/get/list',
    guardar: 'configuracion/save',
  },

  dashboardAdministradores: {
    resumen: 'dashboard/administradores/resumen',
    general: 'dashboard/general',
  },

  mercadoPago: {
    webhook: (companyUuid: string) => `mercado-pago-webhook/${companyUuid}`,
  },

  socios: {
    paginarSolicitudes: 'member/solicitudes/paginate',
    aprobarRegistro: (memberUuid: string) => `member/uuid/${memberUuid}/aprobar-registro`,
    rechazarRegistro: (memberUuid: string) => `member/uuid/${memberUuid}/rechazar-registro`,
    importar: 'member/import',
    resultadosImportacion: 'member/import/results',
    resultadoImportacion: (importId: string) =>
      `member/import/${encodeURIComponent(importId)}/result`,
    progresoImportacion: (importId: string) =>
      `member/import/${encodeURIComponent(importId)}/progress`,
    crearTitular: 'member/titular',
    siguienteNumeroSocio: 'member/numero-socio/siguiente',
    crearFamiliar: 'member/familiar',
    actualizar: (memberUuid: string) => `member/uuid/${memberUuid}`,
    darDeBaja: (memberUuid: string) => `member/uuid/${memberUuid}/baja`,
    actualizarEstado: (memberUuid: string) => `member/uuid/${memberUuid}/estado`,
    subirCertificado: (memberUuid: string) => `member/uuid/${memberUuid}/certificado`,
    listarCertificados: (memberUuid: string) => `member/uuid/${memberUuid}/certificado`,
    resumenCertificados: 'member/certificados/resumen',
    actualizarEstadoCertificado: (certificadoUuid: string) =>
      `member/certificado/uuid/${certificadoUuid}/estado`,
    paginar: 'member/paginate',
    listarFamiliares: (titularMemberUuid: string) => `member/uuid/${titularMemberUuid}/familiares`,
    ficha: (memberUuid: string) => `member/uuid/${memberUuid}/ficha`,
    foto: (memberUuid: string) => `member/uuid/${memberUuid}/foto`,
    registrarTitularPublico: 'member/public/titular',
    crearFamiliarDesdePortal: 'member/portal/familiar',
  },

  profesores: {
    crear: 'profesor',
    paginar: 'profesor/paginate',
    actualizar: (profesorUuid: string) => `profesor/uuid/${profesorUuid}`,
    eliminar: (profesorUuid: string) => `profesor/${profesorUuid}`,
  },

  personal: {
    listar: 'personal',
    buscar: 'personal/buscar',
    crear: 'personal',
    roles: (userUuid: string) => `personal/uuid/${userUuid}/roles`,
  },

  recepcionistas: {
    crear: 'recepcionista',
    paginar: 'recepcionista/paginate',
    actualizar: (recepcionistaUuid: string) => `recepcionista/uuid/${recepcionistaUuid}`,
    eliminar: (recepcionistaUuid: string) => `recepcionista/${recepcionistaUuid}`,
  },

  categorias: {
    crear: 'categoria',
    listar: 'categoria',
    paginar: 'categoria/paginate',
    actualizar: (categoriaUuid: string) => `categoria/${categoriaUuid}`,
    eliminar: (categoriaUuid: string) => `categoria/${categoriaUuid}`,
  },

  cuotasSocialesRango: {
    crear: 'cuota-social-rango',
    paginar: 'cuota-social-rango/paginate',
    actualizar: (cuotaSocialRangoUuid: string) => `cuota-social-rango/${cuotaSocialRangoUuid}`,
    eliminar: (cuotaSocialRangoUuid: string) => `cuota-social-rango/${cuotaSocialRangoUuid}`,
  },

  descuentos: {
    crear: 'descuento',
    actualizar: (descuentoUuid: string) => `descuento/${descuentoUuid}`,
    eliminar: (descuentoUuid: string) => `descuento/${descuentoUuid}`,
    paginarCatalogo: 'descuento/catalogo/paginate',
    paginarPorSocio: 'descuento/paginate',
    asignarASocio: (memberUuid: string) => `descuento/member/${memberUuid}`,
    eliminarAsignacionSocio: (asignacionUuid: string) =>
      `descuento/member-descuento/${asignacionUuid}`,
    finalizarAsignacionSocio: (asignacionUuid: string) =>
      `descuento/member-descuento/${asignacionUuid}/finalizar`,
    asignarAActividad: (inscripcionActividadUuid: string) =>
      `descuento/inscripcion-actividad/${inscripcionActividadUuid}`,
    eliminarAsignacionActividad: (asignacionUuid: string) =>
      `descuento/inscripcion-actividad-descuento/${asignacionUuid}`,
    finalizarAsignacionActividad: (asignacionUuid: string) =>
      `descuento/inscripcion-actividad-descuento/${asignacionUuid}/finalizar`,
  },

  actividades: {
    crear: 'actividad',
    paginar: 'actividad/paginate',
    obtenerDetalle: (actividadUuid: string) => `actividad/${actividadUuid}`,
    actualizar: (actividadUuid: string) => `actividad/${actividadUuid}`,
    inscribirSocio: (actividadUuid: string) => `actividad/${actividadUuid}/inscripcion`,
    darDeBajaInscripcion: (actividadUuid: string) => `actividad/${actividadUuid}/inscripcion/baja`,
    cambiarHorariosInscripcion: (actividadUuid: string) =>
      `actividad/${actividadUuid}/inscripcion/horarios`,
    // TODO(BACKEND-PENDIENTE): endpoints provisionales.
    // Reemplazar cuando se publiquen en OpenAPI.
    eliminar: (actividadUuid: string) => `actividad/${actividadUuid}`,
    paginarInscripciones: (actividadUuid: string) =>
      `actividad/${actividadUuid}/inscripciones/paginate`,
    registrarConsentimiento: (actividadUuid: string) =>
      `actividad/${actividadUuid}/consentimientos`,
  },

  eventosActividad: {
    crear: 'evento-actividad',
    paginar: 'evento-actividad/paginate',
    actualizar: (eventoActividadUuid: string) => `evento-actividad/${eventoActividadUuid}`,
    obtenerDetalle: (eventoActividadUuid: string) => `evento-actividad/${eventoActividadUuid}`,
    cambiarEstado: (eventoActividadUuid: string) =>
      `evento-actividad/${eventoActividadUuid}/estado`,
    eliminar: (eventoActividadUuid: string) => `evento-actividad/${eventoActividadUuid}`,
  },

  competencias: {
    opciones: 'competencias/opciones',
    socios: 'competencias/socios',
    listarEquipos: 'competencias/equipos/listar',
    equipos: 'competencias/equipos',
    equipo: (uuid: string) => `competencias/equipos/${uuid}`,
    jugadores: (equipoUuid: string) => `competencias/equipos/${equipoUuid}/jugadores`,
    jugador: (uuid: string) => `competencias/jugadores/${uuid}`,
    bajaJugador: (uuid: string) => `competencias/jugadores/${uuid}/baja`,
    pase: (uuid: string) => `competencias/jugadores/${uuid}/pase`,
    listarTorneos: 'competencias/torneos/listar',
    torneos: 'competencias/torneos',
    torneo: (uuid: string) => `competencias/torneos/${uuid}`,
    participantes: (torneoUuid: string) => `competencias/torneos/${torneoUuid}/participantes`,
    participante: (uuid: string) => `competencias/participantes/${uuid}`,
    partidos: (torneoUuid: string) => `competencias/torneos/${torneoUuid}/partidos`,
    partido: (uuid: string) => `competencias/partidos/${uuid}`,
    estadisticas: (uuid: string) => `competencias/partidos/${uuid}/estadisticas`,
  },

  membresias: {
    base: 'membresias',
    pases: 'membresias/pases',
    pasesDisponibles: 'membresias/pases/disponibles',
    pase: (uuid: string) => `membresias/pases/${uuid}`,
    config: 'membresias/config',
    socio: (memberUuid: string) => `membresias/socio/${memberUuid}`,
    renovar: (uuid: string) => `membresias/${uuid}/renovar`,
    cambiarPlan: (uuid: string) => `membresias/${uuid}/cambiar-plan`,
    congelar: (uuid: string) => `membresias/${uuid}/congelar`,
    congelamiento: (uuid: string) => `membresias/congelamientos/${uuid}`,
    baja: (uuid: string) => `membresias/${uuid}/baja`,
    paginar: 'membresias/paginate',
    excel: 'membresias/excel',
    dashboard: 'membresias/dashboard',
    portal: 'portal/member/membresias',
    portalRenovar: (uuid: string) => `portal/member/membresias/${uuid}/renovar`,
  },

  equipamiento: {
    base: 'equipamiento',
    paginar: 'equipamiento/paginate',
    resumen: 'equipamiento/resumen',
    equipo: (uuid: string) => `equipamiento/${uuid}`,
    mantenimientos: (uuid: string) => `equipamiento/${uuid}/mantenimientos`,
    mantenimiento: (uuid: string) => `equipamiento/mantenimientos/${uuid}`,
  },

  evaluaciones: {
    acceso: 'evaluaciones/acceso',
    config: 'evaluaciones/config',
    socios: 'evaluaciones/socios',
    socio: (memberUuid: string) => `evaluaciones/socios/${memberUuid}`,
    evaluacion: (uuid: string) => `evaluaciones/${uuid}`,
  },

  entrenamiento: {
    ejercicios: 'entrenamiento/ejercicios',
    ejercicio: (uuid: string) => `entrenamiento/ejercicios/${uuid}`,
    paginarRutinas: 'entrenamiento/rutinas/paginate',
    rutinas: 'entrenamiento/rutinas',
    rutina: (uuid: string) => `entrenamiento/rutinas/${uuid}`,
    reemplazar: (uuid: string) => `entrenamiento/rutinas/${uuid}/reemplazar`,
    archivar: (uuid: string) => `entrenamiento/rutinas/${uuid}/archivar`,
    asignar: (uuid: string) => `entrenamiento/rutinas/${uuid}/asignaciones`,
    finalizarAsignacion: (uuid: string) => `entrenamiento/asignaciones/${uuid}/finalizar`,
    seguimiento: (uuid: string) => `entrenamiento/asignaciones/${uuid}/seguimientos`,
    alumnos: 'entrenamiento/alumnos',
  },

  reportesEconomicos: {
    movimientos: 'treasury/reportes/movimientos',
    excel: 'treasury/reportes/movimientos/excel',
    comparacion: 'treasury/reportes/comparacion',
    cuotas: 'treasury/reportes/cuotas',
  },

  asistenciaActividad: {
    paginar: 'asistencia-actividad/paginate',
    estadisticas: 'asistencia-actividad/estadisticas',
    detalleEstadisticas: (inscripcionUuid: string) =>
      `asistencia-actividad/estadisticas/inscripcion/${inscripcionUuid}`,
    trayectoria: (memberUuid: string) => `asistencia-actividad/trayectoria/${memberUuid}`,
    umbrales: 'asistencia-actividad/umbrales',
  },

  calendario: {
    consultar: 'calendario',
  },

  amenities: {
    crear: 'amenities',
    listar: 'amenities',
    actualizar: (amenityUuid: string) => `amenities/${amenityUuid}`,
    eliminar: (amenityUuid: string) => `amenities/${amenityUuid}`,
    paginarReservas: 'amenities/reservas/paginate',
    crearReserva: 'amenities/reservas',
    cobrarSena: (reservaUuid: string) => `amenities/reservas/${reservaUuid}/cobro-sena`,
    cobrarSaldo: (reservaUuid: string) => `amenities/reservas/${reservaUuid}/cobro-saldo`,
    cobrarTotal: (reservaUuid: string) => `amenities/reservas/${reservaUuid}/cobro-total`,
    confirmarReservaGratuita: (reservaUuid: string) =>
      `amenities/reservas/${reservaUuid}/confirmar`,
    cancelarReserva: (reservaUuid: string) => `amenities/reservas/${reservaUuid}`,
  },

  cuotas: {
    generarDiario: 'treasury/cuota/generacion/diaria',
    generarActividad: 'treasury/cuota/generacion/actividad',
    generarSocial: 'treasury/cuota/generacion/social',
    paginar: 'treasury/cuota/paginate',
    obtenerPorUuid: (cuotaUuid: string) => `treasury/cuota/uuid/${cuotaUuid}`,
    listarPorPersona: (memberUuid: string) => `treasury/cuota/persona/${memberUuid}`,
    listarGrupoPorTitular: (titularMemberUuid: string) =>
      `treasury/cuota/titular/${titularMemberUuid}/grupo`,
    cobrar: 'treasury/cuota/cobro',
    anular: (cuotaUuid: string) => `treasury/cuota/uuid/${cuotaUuid}/anular`,
  },

  balances: {
    obtenerMesActual: 'treasury/balance',
    paginarHistoricos: 'treasury/balance/paginate',
  },

  movimientos: {
    crear: 'treasury/movimiento',
    paginar: 'treasury/movimiento/paginate',
    obtenerPorUuid: (movimientoUuid: string) => `treasury/movimiento/uuid/${movimientoUuid}`,
    anular: (movimientoUuid: string) => `treasury/movimiento/uuid/${movimientoUuid}/anular`,
  },

  pagos: {
    obtenerPorReferenciaExterna: (referenciaExterna: string) =>
      `pago/${encodeURIComponent(referenciaExterna)}`,
  },

  facturas: {
    paginar: 'factura/paginate',
    generarPago: 'factura/pago',
  },

  accesosClub: {
    registrar: 'acceso-club',
    listarPresentes: 'acceso-club/presentes',
    obtenerHistorial: 'acceso-club',
    observarEnVivo: 'acceso-club/live',
  },

  eventosAcceso: {
    crear: 'evento-acceso',
    paginate: 'evento-acceso/paginate',
    detalle: (eventoAccesoUuid: string) => `evento-acceso/${eventoAccesoUuid}`,
    actualizar: (eventoAccesoUuid: string) => `evento-acceso/${eventoAccesoUuid}`,
    eliminar: (eventoAccesoUuid: string) => `evento-acceso/${eventoAccesoUuid}`,
    escanearQr: (eventoAccesoUuid: string) => `evento-acceso/${eventoAccesoUuid}/scan`,
    cobrar: (eventoAccesoUuid: string) => `evento-acceso/${eventoAccesoUuid}/cobro`,
    paginarHistorial: (eventoAccesoUuid: string) =>
      `evento-acceso/${eventoAccesoUuid}/historial/paginate`,
  },

  portalSocio: {
    obtenerCredencial: 'portal/member/credencial',
    obtenerGrupoFamiliar: 'portal/member/grupo',
    misDescuentos: 'portal/member/descuentos',
    obtenerPerfil: 'portal/member/perfil',
    actualizarPerfil: 'portal/member/perfil',
    consultarCalendario: 'portal/calendario',
    listarMisCuotas: 'portal/cuota/mias',
    listarCuotasGrupoFamiliar: 'portal/cuota/grupo',
    listarAmenities: 'portal/amenities',
    inscribirActividad: 'portal/member/actividad/inscripcion',
    cambiarHorariosActividad: 'portal/member/actividad/inscripcion/horarios',
    misAsistencias: 'portal/member/actividad/asistencia',
    detalleMiAsistencia: (inscripcionUuid: string) =>
      `portal/member/actividad/asistencia/inscripcion/${inscripcionUuid}`,
    miTrayectoria: 'portal/member/actividad/trayectoria',
    misEntrenamientos: 'portal/member/entrenamiento',
    misEvaluaciones: 'portal/member/evaluaciones',
    listarMisInscripcionesActividades: 'portal/member/actividad/inscripcion',
    listarInscripcionesActividadesFamiliar: (memberUuid: string) =>
      `portal/member/actividad/inscripcion/familiar/${memberUuid}`,
    reservarAmenity: (amenityUuid: string) => `portal/amenities/${amenityUuid}/reservar`,
    pagarReservaAmenity: (reservaUuid: string) => `portal/amenities/reservas/${reservaUuid}/pago`,
    paginarMisReservasAmenities: 'portal/amenities/reservas/paginate',
    subirCertificado: (memberUuid: string) => `portal/member/uuid/${memberUuid}/certificado`,
  },

  portalProfesor: {
    obtenerCredencial: 'portal/profesor/credencial',
    obtenerPerfil: 'portal/profesor/perfil',
    actualizarPerfil: 'portal/profesor/perfil',
    crearEventoActividad: 'portal/profesor/evento-actividad',
    actualizarEventoActividad: (eventoActividadUuid: string) =>
      `portal/profesor/evento-actividad/${eventoActividadUuid}`,
    obtenerEventoActividad: (eventoActividadUuid: string) =>
      `portal/profesor/evento-actividad/${eventoActividadUuid}`,
    cambiarEstadoEventoActividad: (eventoActividadUuid: string) =>
      `portal/profesor/evento-actividad/${eventoActividadUuid}/estado`,
    eliminarEventoActividad: (eventoActividadUuid: string) =>
      `portal/profesor/evento-actividad/${eventoActividadUuid}`,
    paginarAsistencias: 'portal/profesor/asistencia/paginate',
    seguimientoAlumnos: 'portal/profesor/asistencia/seguimiento',
    misEquipos: 'portal/profesor/equipos',
    torneo: (uuid: string) => `portal/profesor/torneos/${uuid}`,
    detalleSeguimientoAlumno: (inscripcionUuid: string) =>
      `portal/profesor/asistencia/seguimiento/inscripcion/${inscripcionUuid}`,
    trayectoriaAlumno: (memberUuid: string) =>
      `portal/profesor/asistencia/seguimiento/trayectoria/${memberUuid}`,
    obtenerPlanillaAsistencia: (slotUuid: string) => `portal/profesor/asistencia/slot/${slotUuid}`,
    guardarAsistencia: (slotUuid: string) => `portal/profesor/asistencia/slot/${slotUuid}`,
    consultarCalendario: 'portal/profesor/calendario',
  },

  roles: {
    paginar: 'role/paginate',
    obtenerPorUuid: (roleUuid: string) => `role/uuid/${roleUuid}`,
    guardar: 'role/save',
    eliminar: (roleUuid: string) => `role/${roleUuid}`,
  },

  permisos: {
    paginar: 'permission/paginate',
    obtenerPorUuid: (permissionUuid: string) => `permission/uuid/${permissionUuid}`,
    guardar: 'permission/save',
    eliminar: (permissionUuid: string) => `permission/${permissionUuid}`,
  },

  /**
   * Modulo demostrativo del template. Se conserva porque su servicio de ejemplo lo consume.
   */
  ejemploEntidad: {
    paginar: 'ejemplo-entidades/paginate',
    guardar: 'ejemplo-entidades/save',
    detalle: (uuid: string) => `ejemplo-entidades/uuid/${uuid}`,
    eliminar: (uuid: string) => `ejemplo-entidades/${uuid}`,
  },
} as const;
