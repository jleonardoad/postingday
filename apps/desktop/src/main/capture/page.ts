/**
 * Página que abre el teléfono (misma Wi-Fi) para tomar fotos o grabar clips
 * y enviarlos a la biblioteca de la laptop. HTML autocontenido: sin
 * dependencias, sin cuentas, sin servidor externo.
 */
const TEXTS = {
  es: {
    title: 'Enviar a PostingDay',
    hello: 'Conectado con',
    photo: 'Tomar foto',
    video: 'Grabar clip',
    gallery: 'Elegir de la galería',
    hint: 'Lo que subas aparece al instante en la biblioteca de tu laptop.',
    uploading: 'Enviando',
    done: 'Enviado',
    failed: 'No se pudo enviar. Revisa que la laptop siga encendida y en la misma Wi-Fi.',
    recent: 'Enviados en esta sesión',
    tips: 'Consejos: luz natural, celular en vertical, limpia la cámara.'
  },
  en: {
    title: 'Send to PostingDay',
    hello: 'Connected to',
    photo: 'Take photo',
    video: 'Record clip',
    gallery: 'Choose from gallery',
    hint: 'Whatever you upload appears instantly in your laptop library.',
    uploading: 'Sending',
    done: 'Sent',
    failed: 'Could not send. Check the laptop is on and on the same Wi-Fi.',
    recent: 'Sent this session',
    tips: 'Tips: natural light, hold the phone vertically, wipe the lens.'
  }
} as const

export function capturePage(opts: { lang: 'es' | 'en'; businessName: string; base: string }): string {
  const t = TEXTS[opts.lang]
  const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c)
  return `<!doctype html>
<html lang="${opts.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0f172a">
<title>${esc(t.title)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #0f172a; padding: 20px 16px calc(24px + env(safe-area-inset-bottom)); }
  header { margin-bottom: 20px; }
  h1 { font-size: 22px; margin: 0; letter-spacing: -0.3px; }
  .sub { color: #64748b; font-size: 14px; margin-top: 4px; }
  .biz { font-weight: 600; color: #0f172a; }
  .btn { display: flex; align-items: center; gap: 14px; width: 100%; padding: 18px 18px; border-radius: 16px; border: 0; font-size: 18px; font-weight: 600; margin-bottom: 12px; text-align: left; cursor: pointer; }
  .btn .ic { font-size: 26px; width: 36px; text-align: center; }
  .primary { background: #2563eb; color: #fff; }
  .secondary { background: #0f172a; color: #fff; }
  .tertiary { background: #fff; color: #0f172a; border: 1px solid #cbd5e1; }
  input[type=file] { display: none; }
  .hint { font-size: 13px; color: #64748b; margin: 8px 2px 20px; }
  .status { margin: 12px 0; padding: 12px 14px; border-radius: 12px; background: #fff; border: 1px solid #e2e8f0; font-size: 14px; display: none; }
  .status.show { display: block; }
  .bar { height: 6px; background: #e2e8f0; border-radius: 999px; overflow: hidden; margin-top: 8px; }
  .bar > div { height: 100%; width: 0; background: #2563eb; transition: width .2s; }
  .err { color: #b91c1c; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .08em; color: #94a3b8; margin: 24px 0 10px; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .grid img, .grid div.ph { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 10px; background: #e2e8f0; }
  .tips { font-size: 12px; color: #94a3b8; margin-top: 24px; }
</style>
</head>
<body>
<header>
  <h1>${esc(t.title)}</h1>
  <div class="sub">${esc(t.hello)} <span class="biz">${esc(opts.businessName)}</span></div>
</header>

<label class="btn primary"><span class="ic">📷</span>${esc(t.photo)}<input type="file" accept="image/*" capture="environment" data-kind="photo"></label>
<label class="btn secondary"><span class="ic">🎥</span>${esc(t.video)}<input type="file" accept="video/*" capture="environment" data-kind="video"></label>
<label class="btn tertiary"><span class="ic">🖼️</span>${esc(t.gallery)}<input type="file" accept="image/*,video/*" multiple data-kind="gallery"></label>
<div class="hint">${esc(t.hint)}</div>

<div class="status" id="status"><div id="statusText"></div><div class="bar"><div id="bar"></div></div></div>

<h2>${esc(t.recent)}</h2>
<div class="grid" id="recent"></div>
<div class="tips">${esc(t.tips)}</div>

<script>
(function () {
  var base = ${JSON.stringify(opts.base)};
  var T = ${JSON.stringify({ uploading: t.uploading, done: t.done, failed: t.failed })};
  var status = document.getElementById('status'), statusText = document.getElementById('statusText'), bar = document.getElementById('bar'), recent = document.getElementById('recent');
  var queue = [], busy = false;

  function show(text, pct, isErr) {
    status.className = 'status show'; statusText.textContent = text; statusText.className = isErr ? 'err' : '';
    bar.style.width = (pct || 0) + '%';
  }
  function addRecent(item) {
    var el;
    if (item.thumb) { el = document.createElement('img'); el.src = base + '/thumb/' + encodeURIComponent(item.thumb) + '?t=' + Date.now(); }
    else { el = document.createElement('div'); el.className = 'ph'; }
    recent.insertBefore(el, recent.firstChild);
  }
  function next() {
    if (busy || !queue.length) return;
    busy = true;
    var file = queue.shift();
    var xhr = new XMLHttpRequest();
    xhr.open('POST', base + '/upload?name=' + encodeURIComponent(file.name || ('captura-' + Date.now())));
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.upload.onprogress = function (e) { if (e.lengthComputable) show(T.uploading + ' ' + (file.name || '') + ' (' + Math.round(e.loaded / e.total * 100) + '%)', e.loaded / e.total * 100); };
    xhr.onload = function () {
      busy = false;
      if (xhr.status >= 200 && xhr.status < 300) {
        try { addRecent(JSON.parse(xhr.responseText)); } catch (e) {}
        show(T.done + ': ' + (file.name || ''), 100);
        if (!queue.length) setTimeout(function () { status.className = 'status'; }, 2500);
      } else { show(T.failed, 0, true); }
      next();
    };
    xhr.onerror = function () { busy = false; show(T.failed, 0, true); next(); };
    show(T.uploading + ' ' + (file.name || ''), 0);
    xhr.send(file);
  }
  Array.prototype.forEach.call(document.querySelectorAll('input[type=file]'), function (input) {
    input.addEventListener('change', function () {
      Array.prototype.forEach.call(input.files, function (f) { queue.push(f); });
      input.value = '';
      next();
    });
  });
})();
</script>
</body>
</html>`
}
