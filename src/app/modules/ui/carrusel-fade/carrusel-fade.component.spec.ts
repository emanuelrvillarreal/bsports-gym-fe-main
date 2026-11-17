import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CarruselFadeComponent } from './carrusel-fade.component';

describe('CarruselFadeComponent: navegación móvil por deslizamiento', () => {
  const crearFixture = (): ComponentFixture<CarruselFadeComponent<string>> =>
    TestBed.createComponent(CarruselFadeComponent) as ComponentFixture<
      CarruselFadeComponent<string>
    >;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CarruselFadeComponent],
    }).compileComponents();

    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('avanza una card al deslizar hacia la izquierda cuando la prop está activa', () => {
    const fixture = crearFixture();
    fixture.componentRef.setInput('items', ['uno', 'dos', 'tres']);
    fixture.componentRef.setInput('navegacionMovilPorDeslizamiento', true);
    fixture.detectChanges();

    const cambioIndice = vi.fn();
    fixture.componentInstance.cambioIndice.subscribe(cambioIndice);
    const viewport = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
      '.carrusel-fade__viewport',
    );
    expect(viewport).not.toBeNull();

    Object.defineProperty(viewport, 'clientWidth', { configurable: true, value: 320 });
    emitirPointer(viewport!, 'pointerdown', 260, 120);
    emitirPointer(viewport!, 'pointerup', 80, 125);

    expect(cambioIndice).toHaveBeenCalledOnce();
    expect(cambioIndice).toHaveBeenCalledWith(1);
    fixture.destroy();
  });

  it('ignora el gesto cuando la prop no está activa', () => {
    const fixture = crearFixture();
    fixture.componentRef.setInput('items', ['uno', 'dos']);
    fixture.detectChanges();

    const cambioIndice = vi.fn();
    fixture.componentInstance.cambioIndice.subscribe(cambioIndice);
    const viewport = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
      '.carrusel-fade__viewport',
    );

    emitirPointer(viewport!, 'pointerdown', 260, 120);
    emitirPointer(viewport!, 'pointerup', 80, 125);

    expect(cambioIndice).not.toHaveBeenCalled();
    fixture.destroy();
  });
});

function emitirPointer(
  elemento: HTMLElement,
  tipo: 'pointerdown' | 'pointerup',
  clientX: number,
  clientY: number,
): void {
  const evento = new MouseEvent(tipo, { bubbles: true, button: 0, clientX, clientY });
  Object.defineProperties(evento, {
    pointerId: { value: 1 },
    isPrimary: { value: true },
  });
  elemento.dispatchEvent(evento);
}
