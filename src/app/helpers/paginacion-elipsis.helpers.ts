export type ItemPaginacion = number | 'ellipsis';

/** Construye lista de páginas con elipsis para controles de paginación. */
export function construirPaginasConElipsis(
  total: number,
  actual: number,
  cantidadBotonesVisibles: number,
): readonly ItemPaginacion[] {
  const totalNormalizado = Math.max(0, total);
  const visibles = Math.max(3, cantidadBotonesVisibles);
  const paginaActual = Math.min(Math.max(1, actual), Math.max(1, totalNormalizado));

  if (totalNormalizado <= visibles) {
    return Array.from({ length: totalNormalizado }, (_, indice) => indice + 1);
  }

  const margen = Math.floor((visibles - 3) / 2);
  let inicio = Math.max(2, paginaActual - margen);
  let fin = Math.min(totalNormalizado - 1, paginaActual + margen);

  if (paginaActual <= 2 + margen) {
    fin = Math.min(totalNormalizado - 1, visibles - 1);
  }

  if (paginaActual >= totalNormalizado - 1 - margen) {
    inicio = Math.max(2, totalNormalizado - visibles + 2);
  }

  const items: ItemPaginacion[] = [1];

  if (inicio > 2) {
    items.push('ellipsis');
  }

  for (let pagina = inicio; pagina <= fin; pagina += 1) {
    items.push(pagina);
  }

  if (fin < totalNormalizado - 1) {
    items.push('ellipsis');
  }

  items.push(totalNormalizado);
  return items;
}
