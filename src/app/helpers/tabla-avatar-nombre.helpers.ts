/** Avatar con convención nombre + apellido (default de app-tabla-responsive). */
export function obtenerInicialesDesdeNombreApellido(fila: object): string {
  const registro = fila as Record<string, unknown>;
  const nombre = String(registro['nombre'] ?? '');
  const apellido = String(registro['apellido'] ?? '');
  return `${nombre.charAt(0)}${apellido.charAt(0)}`.trim().toUpperCase() || 'S';
}

export function obtenerNombreCompletoDesdeNombreApellido(fila: object): string {
  const registro = fila as Record<string, unknown>;
  return `${String(registro['nombre'] ?? '')} ${String(registro['apellido'] ?? '')}`.trim();
}
