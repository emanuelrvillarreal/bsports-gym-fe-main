import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { BotonComponent } from './boton.component';
import { ThemeModeService } from '../dark-mode/theme-mode.service';
import { ColorThemeService } from '../color-mod/color-theme.service';

describe('BotonComponent', () => {
  const temaResuelto = signal<'dark' | 'light'>('dark');
  const colorPrimario = signal('#123456');
  const colorSecundario = signal('#654321');
  const colorTerciario = signal('#abcdef');

  beforeEach(async () => {
    temaResuelto.set('dark');
    colorPrimario.set('#123456');
    colorSecundario.set('#654321');
    colorTerciario.set('#abcdef');

    await TestBed.configureTestingModule({
      imports: [BotonComponent],
      providers: [
        {
          provide: ThemeModeService,
          useValue: { resolvedMode: temaResuelto },
        },
        {
          provide: ColorThemeService,
          useValue: { colorPrimario, colorSecundario, colorTerciario },
        },
      ],
    }).compileComponents();
  });

  it('usa el color primario por defecto y responde a la paleta activa', () => {
    const fixture = TestBed.createComponent(BotonComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.style.getPropertyValue('--app-boton-color-fondo')).toBe('#123456');

    colorPrimario.set('#fedcba');
    fixture.detectChanges();
    expect(fixture.nativeElement.style.getPropertyValue('--app-boton-color-fondo')).toBe('#fedcba');
    expect(fixture.nativeElement.style.getPropertyValue('--app-boton-color-texto-interaccion')).toBe(
      '#000000',
    );
  });

  it('permite elegir los colores secundario y terciario de la paleta', () => {
    const fixture = TestBed.createComponent(BotonComponent);

    fixture.componentRef.setInput('colorPaleta', 'secundario');
    fixture.detectChanges();
    expect(fixture.nativeElement.style.getPropertyValue('--app-boton-color-fondo')).toBe('#654321');

    fixture.componentRef.setInput('colorPaleta', 'terciario');
    fixture.detectChanges();
    expect(fixture.nativeElement.style.getPropertyValue('--app-boton-color-fondo')).toBe('#abcdef');
  });

  it('usa el azul seguro cuando el motor no entrega un color', () => {
    const fixture = TestBed.createComponent(BotonComponent);
    colorPrimario.set('');
    fixture.detectChanges();

    expect(fixture.nativeElement.style.getPropertyValue('--app-boton-color-fondo')).toBe('#009FE3');
  });

  it('prioriza los colores explicitos sobre la paleta', () => {
    const fixture = TestBed.createComponent(BotonComponent);
    fixture.componentRef.setInput('colorPaleta', 'terciario');
    fixture.componentRef.setInput('colorFondo', '#ff0000');
    fixture.componentRef.setInput('colorInteraccion', '#aa0000');
    fixture.detectChanges();

    expect(fixture.nativeElement.style.getPropertyValue('--app-boton-color-fondo')).toBe('#ff0000');
    expect(fixture.nativeElement.style.getPropertyValue('--app-boton-color-interaccion')).toBe('#aa0000');
  });

  it('calcula el contraste del texto para reposo e interaccion', () => {
    const fixture = TestBed.createComponent(BotonComponent);
    fixture.componentRef.setInput('colorFondo', '#FFFFFF');
    fixture.componentRef.setInput('colorInteraccion', '#000000');
    fixture.detectChanges();

    expect(fixture.nativeElement.style.getPropertyValue('--app-boton-color-texto')).toBe('#000000');
    expect(
      fixture.nativeElement.style.getPropertyValue('--app-boton-color-texto-interaccion'),
    ).toBe('#FFFFFF');
  });

  it('usa el tema como base para colores transparentes', () => {
    const fixture = TestBed.createComponent(BotonComponent);
    fixture.componentRef.setInput('colorFondo', 'rgba(255, 255, 255, 0.2)');

    temaResuelto.set('dark');
    fixture.detectChanges();
    expect(fixture.nativeElement.style.getPropertyValue('--app-boton-color-texto')).toBe('#FFFFFF');

    temaResuelto.set('light');
    fixture.detectChanges();
    expect(fixture.nativeElement.style.getPropertyValue('--app-boton-color-texto')).toBe('#000000');
  });

  it('bloquea el boton y muestra el spinner durante la carga', () => {
    const fixture = TestBed.createComponent(BotonComponent);
    fixture.componentRef.setInput('cargando', true);
    fixture.detectChanges();

    const boton = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    expect(boton.disabled).toBe(true);
    expect(boton.getAttribute('aria-busy')).toBe('true');
    expect(fixture.nativeElement.querySelector('app-load-spinner-blue')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.app-boton__contenido--oculto')).not.toBeNull();
  });

  it('emite accion solo cuando esta habilitado', () => {
    const fixture = TestBed.createComponent(BotonComponent);
    const eventos: MouseEvent[] = [];
    fixture.componentInstance.accion.subscribe((evento) => eventos.push(evento));
    fixture.detectChanges();

    const boton = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    boton.click();
    expect(eventos).toHaveLength(1);

    fixture.componentRef.setInput('deshabilitado', true);
    fixture.detectChanges();
    boton.click();
    expect(eventos).toHaveLength(1);
  });

  it('aplica las presentaciones de texto y solo icono en el host', () => {
    const fixture = TestBed.createComponent(BotonComponent);
    fixture.componentRef.setInput('apariencia', 'texto');
    fixture.componentRef.setInput('soloIcono', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.classList).toContain('app-boton-host--texto');
    expect(fixture.nativeElement.classList).toContain('app-boton-host--solo-icono');
  });

  it('reenvia el aria-label al boton nativo interno', () => {
    const fixture = TestBed.createComponent(BotonComponent);
    fixture.componentRef.setInput('aria-label', 'Cerrar modal');
    fixture.componentRef.setInput('aria-expanded', true);
    fixture.componentRef.setInput('aria-checked', false);
    fixture.componentRef.setInput('role', 'switch');
    fixture.detectChanges();

    const boton = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(boton.getAttribute('aria-label')).toBe('Cerrar modal');
    expect(boton.getAttribute('aria-expanded')).toBe('true');
    expect(boton.getAttribute('aria-checked')).toBe('false');
    expect(boton.getAttribute('role')).toBe('switch');
  });

  it('asocia el boton nativo a un formulario externo', () => {
    const fixture = TestBed.createComponent(BotonComponent);
    fixture.componentRef.setInput('form', 'formulario-popup');
    fixture.componentRef.setInput('tipo', 'submit');
    fixture.detectChanges();

    const boton = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(boton.getAttribute('form')).toBe('formulario-popup');
    expect(boton.type).toBe('submit');
  });

  it('expone el foco del boton nativo para controles compuestos', () => {
    const fixture = TestBed.createComponent(BotonComponent);
    fixture.detectChanges();

    fixture.componentInstance.enfocar();

    expect(document.activeElement).toBe(fixture.componentInstance.obtenerElementoNativo());
  });
});
