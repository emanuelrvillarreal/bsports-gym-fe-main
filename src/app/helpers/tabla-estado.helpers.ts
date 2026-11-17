/** Resolución de columnas tipo estado (convenciones de cuotas / asistencia). */
export function resolverEstadoTabla(valor: unknown): boolean {
  if (typeof valor === 'boolean') {
    return valor;
  }

  if (typeof valor === 'number') {
    return valor > 0;
  }

  if (typeof valor === 'string') {
    const normalizado = valor.trim().toUpperCase();

    if (!normalizado) {
      return false;
    }

    return [
      'AL_DIA',
      'AL DIA',
      'ACTIVO',
      'INGRESO',
      'PAGADA',
      'PAGO',
      'PAGADO',
      'OK',
      'TRUE',
      'SI',
    ].includes(normalizado);
  }

  return Boolean(valor);
}

export function formatearEstadoTabla(valor: unknown): string {
  if (typeof valor === 'string') {
    const normalizado = valor.trim().toUpperCase();

    if (normalizado === 'AL_DIA' || normalizado === 'AL DIA') {
      return 'Al dia';
    }

    if (normalizado === 'MOROSO') {
      return 'Moroso';
    }

    if (normalizado === 'INHABILITADO' || normalizado === 'INABILITADO') {
      return 'Inhabilitado';
    }

    if (normalizado === 'INACTIVO') {
      return 'Inactivo';
    }

    if (normalizado === 'SUSPENDIDO') {
      return 'Suspendido';
    }

    if (normalizado === 'PRESENTE') {
      return 'Presente';
    }

    if (normalizado === 'INGRESO') {
      return 'Ingreso';
    }

    if (normalizado === 'EGRESO') {
      return 'Egreso';
    }

    if (normalizado === 'AUSENTE') {
      return 'Ausente';
    }

    if (normalizado === 'AUSENTE_JUSTIFICADO') return 'Justificada';

    if (normalizado === 'PENDIENTE') return 'Pendiente';
    if (normalizado === 'VENCIDA') return 'Vencida';
    if (normalizado === 'PAGADA') return 'Pagada';
    if (normalizado === 'ANULADA') return 'Anulada';
    if (normalizado === 'ACTIVO') return 'Activo';
    if (normalizado === 'ANULADO') return 'Anulado';
  }

  return resolverEstadoTabla(valor) ? 'Al dia' : 'Pendiente';
}

export function obtenerClaseEstadoTabla(valor: unknown, alDia: boolean): string | null {
  if (typeof valor === 'string') {
    const normalizado = valor.trim().toUpperCase();

    if (normalizado === 'INHABILITADO' || normalizado === 'INABILITADO') {
      return 'tabla-responsive__estado--inhabilitado';
    }

    if (normalizado === 'MOROSO') {
      return 'tabla-responsive__estado--moroso';
    }

    if (normalizado === 'INACTIVO') {
      return 'tabla-responsive__estado--inactivo';
    }

    if (normalizado === 'SUSPENDIDO') {
      return 'tabla-responsive__estado--suspendido';
    }

    if (normalizado === 'AUSENTE') {
      return 'tabla-responsive__estado--ausente';
    }

    if (normalizado === 'AUSENTE_JUSTIFICADO') {
      return 'tabla-responsive__estado--suspendido';
    }

    if (normalizado === 'PRESENTE') {
      return 'tabla-responsive__estado--presente';
    }

    if (normalizado === 'INGRESO') {
      return 'tabla-responsive__estado--presente';
    }

    if (normalizado === 'EGRESO') {
      return 'tabla-responsive__estado--egreso';
    }

    if (['PENDIENTE', 'VENCIDA'].includes(normalizado)) {
      return 'tabla-responsive__estado--debe';
    }

    if (['ANULADA', 'ANULADO'].includes(normalizado)) {
      return 'tabla-responsive__estado--inactivo';
    }
  }

  return alDia ? null : 'tabla-responsive__estado--debe';
}
