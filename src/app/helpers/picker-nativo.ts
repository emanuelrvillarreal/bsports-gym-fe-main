export function abrirSelectorNativo(input?: HTMLInputElement | null): void {
  if (!input) {
    return;
  }

  if (typeof input.showPicker === 'function') {
    try {
      input.showPicker();
      return;
    } catch {
      // Algunos navegadores exigen un gesto de usuario estricto.
      // Si falla, dejamos disponible el foco manual sobre el input.
    }
  }

  input.focus();
}
