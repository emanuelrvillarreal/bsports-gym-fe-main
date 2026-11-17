/** Ayuda corta de cada pantalla del panel: para qué sirve y los pasos de lo más común. */
export interface AyudaPantalla {
  readonly texto: string;
  readonly pasos: readonly string[];
}

/** Clave: id de la solapa (ver secciones-administracion.ts). */
export const AYUDAS_PANTALLAS: Readonly<Record<string, AyudaPantalla>> = {
  socios: {
    texto: 'Acá están todas las personas del gimnasio. Tocá un socio para ver sus datos, si está al día y en qué está anotado.',
    pasos: [
      'Para buscar, escribí el nombre, el DNI o el número de socio.',
      'Para agregar a alguien, tocá "Nuevo titular".',
      'Para editarlo, anotar a un familiar o darlo de baja, usá los botones de la derecha de su fila.',
    ],
  },
  solicitudes: {
    texto: 'Personas que se anotaron solas desde la página del gimnasio y esperan que las aceptes.',
    pasos: ['Revisá los datos de la persona.', 'Tocá "Aprobar" para hacerla socia o "Rechazar" si no corresponde.'],
  },
  evaluaciones: {
    texto: 'Las mediciones físicas de cada socio (peso, pruebas, etc.) para ver cómo evoluciona.',
    pasos: ['Elegí el socio.', 'Cargá una evaluación nueva o mirá las anteriores.'],
  },
  actividades: {
    texto: 'Las clases y deportes del gimnasio, con sus horarios y quiénes están anotados.',
    pasos: [
      'Para anotar a un socio, buscá la actividad y tocá "Inscribir".',
      'Elegí al socio y los horarios, y confirmá. La cuota se genera sola.',
      'Para crear una actividad nueva, tocá "Nueva actividad".',
    ],
  },
  eventos: {
    texto: 'Partidos, torneos, clases especiales o salidas que pasan en una fecha puntual.',
    pasos: ['Tocá "Nuevo evento" y completá la fecha y el lugar.', 'Después podés anotar a los participantes.'],
  },
  categorias: {
    texto: 'Los grupos por edad o nivel (por ejemplo "Infantil" o "Primera") que usan las actividades.',
    pasos: ['Creá la categoría con su nombre y edades.', 'Después la elegís al crear o editar una actividad.'],
  },
  asistencia: {
    texto: 'Para pasar lista: quién vino a cada clase.',
    pasos: ['Elegí la actividad y el día.', 'Marcá a los que vinieron y guardá.'],
  },
  entrenamiento: {
    texto: 'Rutinas y planes de entrenamiento para los socios.',
    pasos: ['Creá una rutina.', 'Asignásela a los socios que la van a hacer.'],
  },
  cuotas: {
    texto: 'Todo lo que los socios tienen que pagar: cuotas del gimnasio, de actividades y pases.',
    pasos: [
      'Para cobrar, tocá "Cobrar" en la fila de la cuota (o "Nuevo cobro" arriba).',
      'Elegí cómo paga: efectivo, transferencia, Mercado Pago u otro.',
      'Para ver quién debe, filtrá por estado "Vencida".',
    ],
  },
  ingresos: {
    texto: 'La plata que entró al gimnasio: cada cobro registrado queda acá.',
    pasos: ['Filtrá por fecha para ver lo cobrado en un día o un mes.', 'Si un cobro se cargó mal, podés anularlo.'],
  },
  'cuota-social': {
    texto: 'Cuánto paga cada socio por ser socio del gimnasio, todos los meses.',
    pasos: ['Cargá el importe de la cuota.', 'El sistema genera las cuotas solo cada mes.'],
  },
  descuentos: {
    texto: 'Rebajas que se pueden aplicar a las cuotas (por ejemplo, hermanos o jubilados).',
    pasos: ['Creá el descuento con su porcentaje o monto.', 'Asignáselo al socio o a la inscripción que corresponda.'],
  },
  reportes: {
    texto: 'Cuánto entró y cuánto salió de plata, por mes y por tipo.',
    pasos: ['Elegí el período.', 'Si lo necesitás en Excel, tocá "Exportar".'],
  },
  accesos: {
    texto: 'Para anotar quién entra al gimnasio, con el QR del socio o buscándolo por nombre.',
    pasos: ['Escaneá el QR del socio o buscalo.', 'El sistema te avisa si puede entrar o por qué no.'],
  },
  'entradas-eventos': {
    texto: 'Las entradas vendidas para eventos y su control en la puerta.',
    pasos: ['Elegí el evento.', 'Escaneá o buscá la entrada para marcarla como usada.'],
  },
  amenities: {
    texto: 'Las canchas, la pileta y otros espacios del gimnasio que se pueden reservar.',
    pasos: ['Elegí el lugar y el día.', 'Tocá un horario libre para reservarlo para un socio.'],
  },
  membresias: {
    texto: 'Los pases que compraron los socios, cuándo vencen y si están pagos.',
    pasos: [
      'Para venderle un pase a un socio, andá a Socios y en su fila elegí "Membresías".',
      'Acá podés ver todos, filtrar por estado y exportar a Excel.',
    ],
  },
  pases: {
    texto: 'Los tipos de pase que ofrece el gimnasio (por ejemplo, "Pase libre mensual"), con su precio y lo que incluyen.',
    pasos: ['Tocá "Nuevo pase" y completá nombre, duración y precio.', 'Marcá qué actividades o lugares incluye.'],
  },
  competencias: {
    texto: 'Los equipos del gimnasio y los torneos en los que juegan.',
    pasos: ['Creá el equipo y sumá a los jugadores.', 'Cargá los partidos y sus resultados.'],
  },
  equipamiento: {
    texto: 'Las cosas del gimnasio (pelotas, máquinas, redes) y su mantenimiento.',
    pasos: ['Cargá cada elemento con su cantidad.', 'Anotá cuando se presta o se arregla.'],
  },
  personal: {
    texto: 'Todas las personas que trabajan en el gimnasio y qué puede hacer cada una.',
    pasos: [
      'Tocá "Agregar persona", poné su DNI y tocá Buscar (si ya es socio, se completan sus datos).',
      'Tildá uno o varios roles: Administrador, Recepción o Profesor.',
      'Para quitar un rol, destildalo. Quien tiene varios roles elige con cuál entrar al iniciar sesión.',
    ],
  },
  profesores: {
    texto: 'Los profesores del gimnasio y las actividades que dan.',
    pasos: ['Tocá "Nuevo profesor" y cargá sus datos.', 'Asignalo a las actividades que da.'],
  },
  recepcion: {
    texto: 'Las personas que atienden la recepción y pueden usar el sistema.',
    pasos: ['Agregá a la persona con su email.', 'Le llega un correo para entrar.'],
  },
  'datos-club': {
    texto: 'Los datos del gimnasio: nombre, logo, dirección y contacto.',
    pasos: ['Cambiá lo que necesites.', 'Tocá "Guardar".'],
  },
  'menu-solapas': {
    texto: 'Elegí qué pantallas se ven en el menú. Lo que no usan, lo pueden esconder para que sea más simple.',
    pasos: ['Destildá las pantallas que no usan.', 'Guardá. Se pueden volver a mostrar cuando quieran.'],
  },
};
