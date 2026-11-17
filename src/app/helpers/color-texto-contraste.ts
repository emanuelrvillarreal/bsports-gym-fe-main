export type ColorTextoContraste = '#000000' | '#FFFFFF';

interface RgbColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

const COLOR_TEXTO_OSCURO: ColorTextoContraste = '#000000';
const COLOR_TEXTO_CLARO: ColorTextoContraste = '#FFFFFF';
const FONDO_FALLBACK: RgbColor = { r: 255, g: 255, b: 255, a: 1 };

export function obtenerColorTextoContraste(
  colorFondo: string,
  colorBase?: string,
): ColorTextoContraste {
  const fondo = parsearColorCss(colorFondo);
  if (!fondo) {
    return COLOR_TEXTO_CLARO;
  }

  const base = parsearColorCss(colorBase ?? '') ?? FONDO_FALLBACK;
  const compuesto = componerColorSobreBase(fondo, base);
  const luminanciaFondo = calcularLuminancia(compuesto);
  const contrasteBlanco = calcularContraste(luminanciaFondo, 1);
  const contrasteNegro = calcularContraste(luminanciaFondo, 0);

  return contrasteBlanco >= contrasteNegro ? COLOR_TEXTO_CLARO : COLOR_TEXTO_OSCURO;
}

/**
 * Obtiene el contraste para un gradiente a partir del color medio de sus extremos.
 * Es útil cuando el texto recorre toda la superficie del gradiente.
 */
export function obtenerColorTextoContrasteGradiente(
  colorInicio: string,
  colorFin: string,
  colorBase?: string,
): ColorTextoContraste {
  const inicio = parsearColorCss(colorInicio);
  const fin = parsearColorCss(colorFin);

  if (!inicio || !fin) {
    return obtenerColorTextoContraste(colorInicio, colorBase);
  }

  const colorMedio = `rgba(${Math.round((inicio.r + fin.r) / 2)}, ${Math.round((inicio.g + fin.g) / 2)}, ${Math.round((inicio.b + fin.b) / 2)}, ${(inicio.a + fin.a) / 2})`;
  return obtenerColorTextoContraste(colorMedio, colorBase);
}

export function parsearColorCss(color: string): RgbColor | null {
  const valor = color.trim();
  if (!valor) {
    return null;
  }

  return parsearHex(valor)
    ?? parsearRgb(valor)
    ?? parsearHsl(valor)
    ?? parsearColorSrgb(valor);
}

function parsearHex(color: string): RgbColor | null {
  const match = /^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.exec(color);
  if (!match) {
    return null;
  }

  const hex = match[1];
  const normalizado = hex.length <= 4
    ? hex.split('').map((parte) => parte + parte).join('')
    : hex;

  if (normalizado.length !== 6 && normalizado.length !== 8) {
    return null;
  }

  const r = Number.parseInt(normalizado.slice(0, 2), 16);
  const g = Number.parseInt(normalizado.slice(2, 4), 16);
  const b = Number.parseInt(normalizado.slice(4, 6), 16);
  const a = normalizado.length === 8
    ? Number.parseInt(normalizado.slice(6, 8), 16) / 255
    : 1;

  return crearColorRgb(r, g, b, a);
}

function parsearRgb(color: string): RgbColor | null {
  const match = /^rgba?\((.+)\)$/i.exec(color);
  if (!match) {
    return null;
  }

  const partes = match[1].split(',').map((parte) => parte.trim());
  if (partes.length !== 3 && partes.length !== 4) {
    return null;
  }

  const r = parsearCanalRgb(partes[0]);
  const g = parsearCanalRgb(partes[1]);
  const b = parsearCanalRgb(partes[2]);
  const a = partes.length === 4 ? parsearAlpha(partes[3]) : 1;

  if (r === null || g === null || b === null || a === null) {
    return null;
  }

  return crearColorRgb(r, g, b, a);
}

function parsearHsl(color: string): RgbColor | null {
  const match = /^hsla?\((.+)\)$/i.exec(color);
  if (!match) {
    return null;
  }

  const partes = match[1].split(',').map((parte) => parte.trim());
  if (partes.length !== 3 && partes.length !== 4) {
    return null;
  }

  const h = parsearHue(partes[0]);
  const s = parsearPorcentaje(partes[1]);
  const l = parsearPorcentaje(partes[2]);
  const a = partes.length === 4 ? parsearAlpha(partes[3]) : 1;

  if (h === null || s === null || l === null || a === null) {
    return null;
  }

  const { r, g, b } = convertirHslArgb(h, s, l);
  return crearColorRgb(r, g, b, a);
}

function parsearColorSrgb(color: string): RgbColor | null {
  const match = /^color\(\s*srgb\s+(.+)\)$/i.exec(color);
  if (!match) {
    return null;
  }

  const contenido = match[1].trim();
  const [canalesTexto, alphaTexto] = contenido.split('/').map((parte) => parte.trim());
  const canales = canalesTexto.split(/\s+/).filter(Boolean);
  if (canales.length !== 3) {
    return null;
  }

  const r = parsearCanalSrgb(canales[0]);
  const g = parsearCanalSrgb(canales[1]);
  const b = parsearCanalSrgb(canales[2]);
  const a = alphaTexto ? parsearAlpha(alphaTexto) : 1;

  if (r === null || g === null || b === null || a === null) {
    return null;
  }

  return crearColorRgb(r, g, b, a);
}

function parsearCanalRgb(valor: string): number | null {
  if (valor.endsWith('%')) {
    const porcentaje = Number.parseFloat(valor.slice(0, -1));
    if (!Number.isFinite(porcentaje)) {
      return null;
    }

    return limitarEntre0y255((porcentaje / 100) * 255);
  }

  const numero = Number.parseFloat(valor);
  if (!Number.isFinite(numero)) {
    return null;
  }

  return limitarEntre0y255(numero);
}

function parsearCanalSrgb(valor: string): number | null {
  const numero = Number.parseFloat(valor);
  if (!Number.isFinite(numero)) {
    return null;
  }

  if (numero >= 0 && numero <= 1) {
    return limitarEntre0y255(numero * 255);
  }

  return limitarEntre0y255(numero);
}

function parsearAlpha(valor: string): number | null {
  if (valor.endsWith('%')) {
    const porcentaje = Number.parseFloat(valor.slice(0, -1));
    if (!Number.isFinite(porcentaje)) {
      return null;
    }

    return limitarEntre0y1(porcentaje / 100);
  }

  const numero = Number.parseFloat(valor);
  if (!Number.isFinite(numero)) {
    return null;
  }

  return limitarEntre0y1(numero);
}

function parsearHue(valor: string): number | null {
  const numero = Number.parseFloat(valor.replace(/deg$/i, '').trim());
  if (!Number.isFinite(numero)) {
    return null;
  }

  const hue = ((numero % 360) + 360) % 360;
  return hue;
}

function parsearPorcentaje(valor: string): number | null {
  if (!valor.endsWith('%')) {
    return null;
  }

  const numero = Number.parseFloat(valor.slice(0, -1));
  if (!Number.isFinite(numero)) {
    return null;
  }

  return limitarEntre0y1(numero / 100);
}

function convertirHslArgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const c = (1 - Math.abs((2 * l) - 1)) * s;
  const hPrima = h / 60;
  const x = c * (1 - Math.abs((hPrima % 2) - 1));
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;

  if (hPrima >= 0 && hPrima < 1) {
    r1 = c;
    g1 = x;
  } else if (hPrima < 2) {
    r1 = x;
    g1 = c;
  } else if (hPrima < 3) {
    g1 = c;
    b1 = x;
  } else if (hPrima < 4) {
    g1 = x;
    b1 = c;
  } else if (hPrima < 5) {
    r1 = x;
    b1 = c;
  } else {
    r1 = c;
    b1 = x;
  }

  const m = l - (c / 2);
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

function componerColorSobreBase(colorFrontal: RgbColor, colorBase: RgbColor): RgbColor {
  const alpha = limitarEntre0y1(colorFrontal.a);
  if (alpha >= 1) {
    return colorFrontal;
  }

  const alphaBase = limitarEntre0y1(colorBase.a);
  const alphaSalida = alpha + (alphaBase * (1 - alpha));
  if (alphaSalida <= 0) {
    return FONDO_FALLBACK;
  }

  const r = ((colorFrontal.r * alpha) + (colorBase.r * alphaBase * (1 - alpha))) / alphaSalida;
  const g = ((colorFrontal.g * alpha) + (colorBase.g * alphaBase * (1 - alpha))) / alphaSalida;
  const b = ((colorFrontal.b * alpha) + (colorBase.b * alphaBase * (1 - alpha))) / alphaSalida;

  return crearColorRgb(r, g, b, alphaSalida) ?? FONDO_FALLBACK;
}

function calcularLuminancia(color: RgbColor): number {
  const r = canalSrgbALineal(color.r);
  const g = canalSrgbALineal(color.g);
  const b = canalSrgbALineal(color.b);
  return (0.2126 * r) + (0.7152 * g) + (0.0722 * b);
}

function canalSrgbALineal(valor: number): number {
  const normalizado = valor / 255;
  return normalizado <= 0.03928
    ? normalizado / 12.92
    : ((normalizado + 0.055) / 1.055) ** 2.4;
}

function calcularContraste(luminanciaA: number, luminanciaB: number): number {
  const claro = Math.max(luminanciaA, luminanciaB);
  const oscuro = Math.min(luminanciaA, luminanciaB);
  return (claro + 0.05) / (oscuro + 0.05);
}

function crearColorRgb(r: number, g: number, b: number, a: number): RgbColor | null {
  if (![r, g, b, a].every(Number.isFinite)) {
    return null;
  }

  return {
    r: limitarEntre0y255(r),
    g: limitarEntre0y255(g),
    b: limitarEntre0y255(b),
    a: limitarEntre0y1(a),
  };
}

function limitarEntre0y255(valor: number): number {
  return Math.round(Math.min(255, Math.max(0, valor)));
}

function limitarEntre0y1(valor: number): number {
  return Math.min(1, Math.max(0, valor));
}
