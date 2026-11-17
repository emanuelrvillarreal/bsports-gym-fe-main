import { describe, expect, it } from 'vitest';

import { resolverVideo } from './reproductor-video.helpers';

const YT = 'https://www.youtube-nocookie.com/embed/aclHkVaku9U?rel=0';

describe('resolverVideo', () => {
  it('reconoce todas las formas de enlace de YouTube', () => {
    expect(resolverVideo('https://www.youtube.com/watch?v=aclHkVaku9U')).toEqual({ tipo: 'iframe', proveedor: 'YouTube', url: YT });
    expect(resolverVideo('https://youtu.be/aclHkVaku9U')?.url).toBe(YT);
    expect(resolverVideo('https://youtube.com/shorts/aclHkVaku9U')?.url).toBe(YT);
    expect(resolverVideo('https://m.youtube.com/watch?v=aclHkVaku9U&list=x')?.url).toBe(YT);
    expect(resolverVideo('https://www.youtube.com/embed/aclHkVaku9U')?.url).toBe(YT);
  });

  it('respeta el segundo de inicio de YouTube', () => {
    expect(resolverVideo('https://youtu.be/aclHkVaku9U?t=90')?.url).toBe(`${YT}&start=90`);
    expect(resolverVideo('https://www.youtube.com/watch?v=aclHkVaku9U&t=1m30s')?.url).toBe(`${YT}&start=90`);
  });

  it('reconoce Vimeo y Google Drive', () => {
    expect(resolverVideo('https://vimeo.com/76979871')).toEqual({
      tipo: 'iframe',
      proveedor: 'Vimeo',
      url: 'https://player.vimeo.com/video/76979871',
    });
    expect(resolverVideo('https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/view?usp=sharing')).toEqual({
      tipo: 'iframe',
      proveedor: 'Google Drive',
      url: 'https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/preview',
    });
  });

  it('reproduce archivos de video directos', () => {
    expect(resolverVideo('https://club.example.com/videos/plancha.mp4')).toEqual({
      tipo: 'archivo',
      url: 'https://club.example.com/videos/plancha.mp4',
    });
    expect(resolverVideo('https://cdn.example.com/a.webm?token=1')?.tipo).toBe('archivo');
  });

  it('cualquier otro enlace se abre aparte', () => {
    expect(resolverVideo('https://www.instagram.com/reel/abc/')?.tipo).toBe('externo');
    expect(resolverVideo('https://www.youtube.com/channel/UC123')?.tipo).toBe('externo');
  });

  it('descarta enlaces vacíos, inválidos o con otro protocolo', () => {
    expect(resolverVideo('')).toBeNull();
    expect(resolverVideo(null)).toBeNull();
    expect(resolverVideo('no es un enlace')).toBeNull();
    expect(resolverVideo('javascript:alert(1)')).toBeNull();
  });
});
