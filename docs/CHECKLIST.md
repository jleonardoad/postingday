# PostingDay — Checklist de estado y pendientes

> Última actualización: 2026-11-08. Documento para retomar el trabajo sin contexto previo.
> Plan de producto completo: [`docs/plan.md`](./plan.md). Repositorio: `github.com/jleonardoad/postingday` (público).

## 1. Qué es y qué decisiones mandan

- App **de escritorio, local, descargable** (Electron). Los datos del negocio viven en la laptop del cliente.
- **Sin base de datos de usuarios ni cuentas** (regla fijada por el usuario). Cobro futuro: clave de licencia; IA y publicación: servicio mínimo que solo conoce licencias, o claves propias del cliente (BYOK). Nunca correos ni contraseñas en servidores nuestros.
- Prioridad actual: **probar de punta a punta la generación de contenido** (imagen → textos → post → reel) antes de pasar a web o a publicación automática.
- Principios de interfaz: lo más simple posible, explicado en cada pantalla, vista previa antes de elegir, la app genera todo.

## 2. Estado: qué funciona hoy (verificado)

| Área | Estado | Notas |
|---|---|---|
| Perfil del negocio (Mi negocio) | ✅ | Formulario = `contexto-maestro`; guarda en SQLite. |
| Biblioteca de medios | ✅ | Importar del ordenador, miniaturas con FFmpeg, notas y etiquetas. |
| Captura desde el celular | ✅ | Wi-Fi local + QR (`src/main/capture/`), sin cuentas ni nube. Probado con envío simulado. Pendiente probar con un teléfono real (macOS pedirá «Permitir conexiones entrantes»). |
| Galería «Crear» con 8 formatos y vistas previas reales | ✅ | Plantillas HTML/CSS a 1080 px (`templates/TemplatePreview.tsx`), catálogo en `src/shared/formats.ts`. |
| Textos con IA | ✅ | **Ollama local (`qwen3:8b`) funcionando**; Claude (`claude-opus-5-5`) implementado pero sin probar con clave real (solo ruta de error 401). Proveedor de ejemplo (mock) como respaldo. |
| Imágenes con IA | ✅ | **Motor local integrado** stable-diffusion.cpp + Z-Image-Turbo funcionando (lento, ver §5); OpenAI `gpt-image-1` implementado sin probar (falta clave); servidor externo A1111/Draw Things soportado; tarjeta de ejemplo sin motor. |
| Editor de publicación | ✅ | Textos editables, caption, hashtags, regenerar, aprobar. |
| Exportar post (PNG 1080×1080) | ✅ | Ventana oculta + `capturePage`. |
| Exportar reel (MP4 1080×1920) | ✅ | Guion de 3 escenas, capas de texto transparentes, Ken Burns / clips, música (archivos en `music/` o cama sintética). ~5 s por reel. |
| E2E «destornillador de estría» sin foto | ✅ | Imagen real generada en el Mac → textos Ollama → post → reel. |
| Interfaz ES/EN | ✅ | `react-i18next`; 254+ claves iguales en ambos idiomas. |

## 3. Cómo ejecutar y probar

```bash
cd ~/work/postingday
pnpm install                   # si luego sale «Electron uninstall»: pnpm rebuild electron
cd apps/desktop && pnpm dev    # abre la app (recarga en caliente)
pnpm typecheck                 # desde apps/desktop o la raíz
```

Flags de verificación sin tocar la interfaz (combinables):

| Variable | Efecto |
|---|---|
| `PD_SCREENSHOT=/ruta.png` (+ `PD_SCREENSHOT_DELAY=ms`) | Captura la ventana y cierra la app |
| `PD_VIEW=home\|create\|create/<formato>\|pieces\|piece/<id>\|profile\|library\|library/capture\|library/image\|settings` | Abre una vista concreta |
| `PD_SELFTEST=1` | Autoprueba del proceso principal (negocio, medios, generación, export, captura móvil simulada) |
| `PD_IMPORT_FILES=a.jpg,b.mp4` | Importa archivos en la autoprueba |
| `PD_SELFTEST_TOPIC="destornillador de estría"` | E2E completo de un producto sin foto (imagen → textos → post → reel + fotogramas) |
| `PD_SELFTEST_REEL=1` | Dos reels de prueba (foto y clip) con fotogramas extraídos |
| `PD_SELFTEST_CLAUDE=1` | Prueba el proveedor Claude (requiere `ANTHROPIC_API_KEY`) |
| `PD_SD_VERBOSE=1`, `PD_SD_SIZE=768`, `PD_SD_STEPS=6` | Logs y parámetros del motor de imágenes |
| `PD_PHONE_SHOT=/ruta.png` | Captura la página del teléfono a tamaño móvil |
| `PD_FFMPEG`, `PD_FFPROBE`, `OLLAMA_HOST`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `PD_OPENAI_IMAGE_MODEL` | Rutas y claves |

Ejemplo del E2E completo:

```bash
cd ~/work/postingday/apps/desktop
PD_SELFTEST=1 PD_SELFTEST_TOPIC="destornillador de estría" PD_SCREENSHOT=/tmp/pd.png pnpm dev
```

## 4. Dónde están los datos y los motores (esta máquina)

> Instalación desde cero en otra máquina, modelos con URL/tamaño/licencia y migración de datos y modelos: [`INSTALACION.md`](./INSTALACION.md).

`~/Library/Application Support/PostingDay/`

| Carpeta / archivo | Contenido |
|---|---|
| `postingday.db` | SQLite (negocio, medios, piezas, ajustes, claves cifradas no: en claro, solo en esta máquina) |
| `media/`, `thumbs/`, `exports/` | Archivos importados, miniaturas, PNG/MP4 exportados |
| `music/` | MP3/WAV del usuario para los reels (vacío = cama sintética en `cache/demo-music-v1.wav`) |
| `bin/sdcpp/` | `sd-server`, `sd-cli`, `libstable-diffusion.dylib` (stable-diffusion.cpp `master-1056-9234ad8`, MIT) |
| `models/sdcpp/` | `z_image_turbo-Q8_0.gguf` (6,13 GB, Apache-2.0), `Qwen3-4B-Instruct-2507-Q4_K_M.gguf` (2,33 GB), `ae.safetensors` (320 MB, copia pública de Comfy-Org porque FLUX.1-schnell en HF es gated) |

Ollama: modelo `qwen3:8b` instalado (`ollama list`). Si una descarga de Ollama se atasca, repetir `ollama pull` continúa donde iba.

Datos de prueba cargados: negocio ficticio «Ferretería El Tornillo» (Caracas, teléfono inventado) y fotos/vídeo de SENSARTE. **Borrar antes de cualquier demo a un cliente** (Mi negocio y Biblioteca).

### Permisos de Claude Code (solo para seguir trabajando con el agente)

`~/work/reels/.claude/settings.local.json` tiene reglas `allow` para `~/work/postingday/engine-bin/sd-server` y `sd-cli` (`engine-bin` es un enlace sin espacios a `bin/sdcpp`, ignorado por git). Sin ellas el agente no puede ejecutar el motor descargado.

## 5. Hallazgos importantes (no perderlos)

- **Velocidad del motor de imágenes local** (M4 Pro, 48 GB, Metal): 1024² = 25 s/paso (224 s/imagen con 8 pasos + VAE 14 s); 768² = 13 s/paso (115 s). Configurado 768 px / 6 pasos ≈ 90 s. Primer arranque compila shaders Metal (1-2 min); luego la caché lo deja en segundos. Conclusión: motor «gratis y sin instalar nada», pero lento; para clientes ofrecer OpenAI (segundos, centavos) o Draw Things (Mac, optimizado).
- **Z-Image no entiende bien el español**: «destornillador de estría» generó unas pinzas. Solución implementada: el proveedor de textos (Ollama/Claude) describe el producto en inglés (`describeProduct`) antes de pedir la imagen. Con qwen3:8b la traducción es aceptable, no perfecta.
- **Modelos pequeños y JSON**: qwen3 a veces envuelve el JSON o copia ejemplos en inglés del brief; mitigado con `extractJson`, reintento, recordatorio de idioma al final del prompt y `tidyHashtags` (garantiza `#negocio` y `#ciudad`, descarta variantes mal escritas).
- **Competencia** (investigación del usuario, §1.1 del plan): Predis.ai (19-40 USD) es el referente; el hueco es «lista de tomas + captura móvil + reel con lo real + aprobación»; precio ancla 19 USD.
- **Imagen → vídeo**: nube 0,04-0,13 USD/s (Wan, Hailuo, Kling; Veo 3.1 Lite 0,05 USD/s; Runway Gen-4 Turbo 0,05 USD/s). Open source: Wan 2.2 TI2V-5B (Apache-2.0) corre en Mac con el mismo sd.cpp (`-M vid_gen -i imagen.png`) o con mlx-video, pero tarda entre 15 y 40 min por clip; LTX-2 tiene licencia propia. Para el producto: animación real solo como extra de pago o experimental; el Ken Burns gratuito sigue siendo la base.

- **Tamaño (medido el 2026-11-08, macOS arm64; aún no hay instalador)**: código de la app compilado 1,1 MB; runtime Electron 253 MB en disco; dependencias de producción ≈ 40-90 MB en disco. Instalador estimado ≈ 100-130 MB comprimido / ≈ 350 MB instalado; con FFmpeg estático incluido (obligatorio para clientes: hoy se usa el de Homebrew, 52 MB) ≈ 150-200 MB / ≈ 400 MB. Opcionales: motor de imágenes local 98 MB de binarios + 8,8 GB de modelos (Z-Image Q8 6,1 GB, Qwen3-4B 2,3 GB, VAE 0,3 GB; con Z-Image Q4_K bajaría a ≈ 6,2 GB); Ollama 693 MB de app + ≈ 4,9 GB para `qwen3:8b`. Todo local y gratis ≈ 15 GB; con IA en la nube (claves) ≈ 0,4 GB.

## 6. Pendientes (orden sugerido)

### A. Cierre del E2E de contenido
- [ ] Probar la captura desde el celular con un teléfono real (misma Wi-Fi, QR, permiso de macOS).
- [ ] Probar el proveedor Claude con una clave real (`ANTHROPIC_API_KEY` o Ajustes) y comparar calidad con qwen3.
- [ ] Probar OpenAI `gpt-image-1` con clave (`OPENAI_API_KEY` o Ajustes); confirmar nombre de modelo vigente (`PD_OPENAI_IMAGE_MODEL`).
- [ ] Experimento imagen → vídeo local con Wan 2.2 TI2V-5B (ver §7) y decidir si entra como motor opcional.
- [ ] Reel: transiciones entre escenas (`xfade`), evitar repetir la misma foto, variedad de diseños de capa.
- [ ] Reel: voz en off + subtítulos (necesita TTS: ElevenLabs/OpenAI o una voz local; estructura preparada, proveedor «none»).
- [ ] Plan mensual (20-30 ideas con formato y fecha) y «Plan mensual» en la barra lateral.
- [ ] Lista de tomas en la página del teléfono («graba estas 3 tomas») por formato.
- [ ] Tarjeta de ejemplo: el texto del producto choca con el titular de algunas plantillas (cosmético).
- [ ] Hashtags: limitar a 6-8 y filtrar más variantes raras de modelos pequeños.

### B. Producto y distribución
- [ ] Empaquetado: `electron-builder` (DMG/NSIS), auto-update, instalador del motor dentro de la app (ya existe el botón «Instalar motor local (9 GB)» en Ajustes). Incluir FFmpeg/ffprobe estáticos (p. ej. `ffmpeg-static`, +50-80 MB): los clientes no tendrán Homebrew.
- [ ] Firma: Apple Developer y certificado OV para Windows (requieren LLC, ver plan §7). Para pilotos, instaladores sin firmar con guía.
- [ ] Windows: el motor local solo está preparado para macOS arm64 (`engine.supported`); añadir binario Windows de sd.cpp (Vulkan/CUDA) cuando toque.
- [ ] Música con licencia para distribuir (paquete o generación) en lugar de la cama sintética.
- [ ] Limpiar datos de prueba y añadir un «negocio de demostración» opcional.
- [ ] Rendimiento: probar `z_image_turbo-Q4_K.gguf` (3,6 GB) y `mflux` (MLX) como alternativas más rápidas; medir.

### C. Publicación (sprint 4) y cobro
- [ ] Intermediario de publicación (Upload-Post u otro) o integraciones propias; recordar: sin cuentas de usuario → identidad = clave de licencia.
- [ ] Claves de licencia (pasarela de pago emite la licencia; LLC en EE. UU. para Stripe).
- [ ] Servicio mínimo de créditos de IA por licencia (opcional; alternativa BYOK).
- [ ] Decisión web vs escritorio para más adelante (el usuario: local primero, web después).

### D. Negocio (pospuesto por el usuario)
- [ ] Registrar `postingday.com` (libre el 2026-11-07; también `.app`, `.ai`); reservar `@postingday` (TikTok libre; en YouTube ocupado → `@postingdayapp`); búsqueda USPTO.
- [ ] 5 negocios piloto (rubros variados: ferretería, zapatería, electrodomésticos, 1-2 servicios).
- [ ] LLC en EE. UU. + Stripe.

## 7. Receta del experimento imagen → vídeo local (pendiente)

Modelo: **Wan 2.2 TI2V-5B** (Apache-2.0). Descargar a `~/Library/Application Support/PostingDay/models/wan/`:

- `Wan2.2-TI2V-5B-Q4_K_M.gguf` (3,2 GB) o `Q8_0` (5,0 GB): `https://huggingface.co/QuantStack/Wan2.2-TI2V-5B-GGUF`
- `wan2.2_vae.safetensors`: `https://huggingface.co/Comfy-Org/Wan_2.2_ComfyUI_Repackaged/resolve/main/split_files/vae/wan2.2_vae.safetensors`
- `umt5-xxl-encoder-Q8_0.gguf` (o Q4): `https://huggingface.co/city96/umt5-xxl-encoder-gguf`

Comando (según `docs/wan.md` de stable-diffusion.cpp; verificar el formato de salida, puede ser secuencia de imágenes o MP4):

```bash
~/work/postingday/engine-bin/sd-cli -M vid_gen \
  --diffusion-model "$M/Wan2.2-TI2V-5B-Q4_K_M.gguf" --vae "$M/wan2.2_vae.safetensors" \
  --t5xxl "$M/umt5-xxl-encoder-Q8_0.gguf" -i imagen-del-producto.png \
  -p "slow 360 degree turntable rotation of the product, studio lighting, static camera" \
  --cfg-scale 6.0 --sampling-method euler -W 480 -H 832 --video-frames 33 --flow-shift 3.0 \
  --offload-to-cpu -v -o clip.mp4
```

Medir tiempo total; si supera ~15 min por clip, dejarlo como «experimental» y usar nube (fal.ai: Wan/Kling/Hailuo con una sola clave) para la función «Animar con IA».

## 8. Arquitectura rápida (para orientarse en el código)

```
apps/desktop/src
  main/
    index.ts            arranque, ventana, flags de verificación
    ipc.ts              todos los canales IPC (validados con zod)
    db/                 SQLite (node:sqlite) + migraciones (v3) + repositorios
    media/              ffmpeg.ts (probe/miniaturas), import.ts
    capture/            servidor Wi-Fi local + página del teléfono
    content/            textos: provider.ts, mock.ts, ollama.ts, claude.ts, generate.ts
    images/             imágenes: provider.ts (prompt), openai.ts, local.ts (A1111), sdcpp.ts (motor integrado), mock.ts, generate.ts
    video/              reels: script.ts, render.ts (FFmpeg), music.ts
    render/export.ts    captura de plantillas (post PNG, capas del reel) y exportación
    selftest.ts         autoprueba
  preload/index.ts      puente window.api
  renderer/src/         React: pages/ (Home, Create, Pieces, PieceEditor, Profile, Library, Settings, RenderPage, OverlayPage, PlaceholderPage), templates/, components/, i18n/
  shared/               types.ts, formats.ts, ipc.ts (contrato)
docs/plan.md            plan de producto; docs/CHECKLIST.md este documento
```
