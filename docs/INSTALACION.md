# PostingDay — Instalación en una máquina nueva y modelos de IA

> Guía para montar el entorno de desarrollo desde cero, instalar los modelos de IA y **migrar desde otro ordenador** (datos, fotos y modelos ya descargados). Última revisión: 2026-11-09.
> Estado del proyecto y pendientes: [`CHECKLIST.md`](./CHECKLIST.md).

## 0. Cuánto espacio hace falta

| Componente | Tamaño | ¿Obligatorio? |
|---|---|---|
| Repositorio + `node_modules` (Electron incluido) | ≈ 700 MB | Sí |
| FFmpeg (Homebrew) | ≈ 60 MB | Sí (miniaturas y reels) |
| Motor local de imágenes (binario + 3 modelos) | **≈ 9 GB** | No: alternativa OpenAI con clave |
| Ollama + modelo `qwen3:8b` | **≈ 5,6 GB** | No: alternativa Claude con clave |
| Datos de trabajo (fotos, vídeos, exportaciones) | crece con el uso | — |

Con todo en local y gratis: **≈ 16 GB**. Recomendado: 30 GB libres.

Máquina recomendada: **Mac con Apple Silicon (M1 o superior) y 16 GB de RAM** (con 32 GB el motor de imágenes va más holgado). El motor local integrado solo funciona en Mac Apple Silicon; en Windows o Mac Intel ver §7.

## 1. Requisitos del sistema (macOS)

```bash
# Homebrew (si no está): https://brew.sh
brew install git node pnpm ffmpeg      # Node 22+ (mejor 24), pnpm 10, FFmpeg con ffprobe
node -v && pnpm -v && ffmpeg -version | head -1
```

FFmpeg: la app lo busca en `PD_FFMPEG`/`PD_FFPROBE`, luego en `/opt/homebrew/bin` y `/usr/local/bin`, luego en el `PATH`. Si Ajustes muestra «FFmpeg no encontrado», revisa esa ruta.

## 2. Clonar y arrancar la app

```bash
git clone https://github.com/jleonardoad/postingday.git ~/work/postingday
cd ~/work/postingday
pnpm install                        # si al final sale «Electron uninstall»: pnpm rebuild electron
cd apps/desktop && pnpm dev         # abre la app
```

La app crea su carpeta de datos en `~/Library/Application Support/PostingDay/` (en Windows `%APPDATA%\PostingDay`). Ahí vive todo lo del usuario:

```
PostingDay/
  postingday.db          base SQLite: negocio, medios, piezas, ajustes y claves API
  media/  thumbs/        fotos y vídeos importados + miniaturas
  exports/               PNG y MP4 generados
  music/                 (opcional) MP3/WAV propios para los reels
  cache/                 música sintética y archivos temporales
  bin/sdcpp/             motor de imágenes (sd-server, sd-cli, libstable-diffusion.dylib)
  models/sdcpp/          modelos del motor de imágenes (≈ 8,8 GB)
```

Sin modelos ni claves la app ya funciona: usa «Textos de ejemplo» y «Tarjeta de ejemplo», y exporta posts y reels con tus fotos. Los modelos solo añaden la IA real.

## 3. Modelos de IA que usa el proyecto

### 3.1 Imágenes: motor integrado (stable-diffusion.cpp + Z-Image-Turbo)

Todo se descarga a `~/Library/Application Support/PostingDay/` en las carpetas indicadas. Las URL exactas están en el código: `apps/desktop/src/main/images/sdcpp.ts` (constante `ENGINE`); si se cambia de versión, cambiarlas ahí.

| Archivo | Para qué | Tamaño | Licencia | Origen |
|---|---|---|---|---|
| `bin/sdcpp/` ← `sd-master-9234ad8-bin-Darwin-macOS-26.7.2-arm64.zip` | Motor (servidor HTTP compatible con la API de A1111) | 98 MB | MIT | `github.com/leejet/stable-diffusion.cpp`, release `master-1056-9234ad8` |
| `models/sdcpp/z_image_turbo-Q8_0.gguf` | Modelo de difusión (genera la imagen, 6-8 pasos) | 6,1 GB | Apache-2.0 | `huggingface.co/leejet/Z-Image-Turbo-GGUF` |
| `models/sdcpp/Qwen3-4B-Instruct-2507-Q4_K_M.gguf` | Codificador de texto que Z-Image necesita para entender el prompt | 2,3 GB | Apache-2.0 | `huggingface.co/unsloth/Qwen3-4B-Instruct-2507-GGUF` |
| `models/sdcpp/ae.safetensors` | VAE (convierte el resultado en píxeles) | 320 MB | Apache-2.0 | `huggingface.co/Comfy-Org/z_image_turbo` (`split_files/vae/ae.safetensors`) |

Rendimiento medido en M4 Pro: ≈ 90 s por imagen a 768 px y 6 pasos. El primer arranque compila shaders Metal (1-2 min) y luego queda en caché.

Variante más ligera (no configurada todavía, cambiar `ENGINE.files` para usarla): `z_image_turbo-Q4_K.gguf` ≈ 3,6 GB en el mismo repositorio de Hugging Face; ahorra 2,5 GB con algo menos de calidad.

### 3.2 Textos: Ollama + `qwen3:8b`

| Qué | Tamaño | Licencia | Origen |
|---|---|---|---|
| Ollama (aplicación) | 693 MB | MIT | `ollama.com/download` |
| Modelo `qwen3:8b` | ≈ 5 GB | Apache-2.0 | `ollama pull qwen3:8b` |

La app detecta Ollama en `http://127.0.0.1:11434` (cambiable con `OLLAMA_HOST`) y elige el mejor modelo instalado (orden de preferencia en `apps/desktop/src/main/content/ollama.ts`, `PREFERRED_MODELS`). Otros modelos probados en el código: `qwen3:14b`, `gemma3`, `llama3.1`, `mistral`.

### 3.3 Alternativas en la nube (0 MB, con clave)

- **Textos:** Claude (`claude-opus-5-5`) con `ANTHROPIC_API_KEY` o pegando la clave en Ajustes.
- **Imágenes:** OpenAI `gpt-image-1` con `OPENAI_API_KEY` o en Ajustes (modelo cambiable con `PD_OPENAI_IMAGE_MODEL`).

Las claves se guardan solo en la base local (`settings`, prefijo `secret:`); nunca salen de la máquina salvo hacia Anthropic/OpenAI.

## 4. Instalar el motor de imágenes (tres formas)

### A. Desde la app (la normal)
Ajustes → Imágenes → **«Instalar motor local (9 GB)»**. Descarga con reanudación (si se corta, vuelve a pulsar y continúa desde el `.part`), descomprime y deja todo listo. Al generar la primera imagen arranca `sd-server` solo.

### B. Copiando desde otro Mac (migración, sin descargar nada)
En el Mac viejo las carpetas `bin/sdcpp` y `models/sdcpp` ya contienen todo. Cópialas a la misma ruta del Mac nuevo (AirDrop, disco USB, o por red):

```bash
# desde el Mac viejo, por red local (cambia usuario y nombre del Mac nuevo)
rsync -avh --progress \
  ~/Library/Application\ Support/PostingDay/bin \
  ~/Library/Application\ Support/PostingDay/models \
  usuario@mac-nuevo.local:~/Library/Application\ Support/PostingDay/
```

Al abrir la app, Ajustes debe decir «Instalado». Si no, comprueba que `bin/sdcpp/sd-server` tenga permiso de ejecución (`chmod +x`) y que los tres modelos tengan los nombres exactos de la tabla.

### C. Manual con curl (sin la app)

```bash
D=~/Library/Application\ Support/PostingDay
mkdir -p "$D/bin/sdcpp" "$D/models/sdcpp"
cd "$D/bin/sdcpp" && curl -L -O https://github.com/leejet/stable-diffusion.cpp/releases/download/master-1056-9234ad8/sd-master-9234ad8-bin-Darwin-macOS-26.7.2-arm64.zip \
  && unzip -o sd-master-9234ad8-bin-Darwin-macOS-26.7.2-arm64.zip && chmod +x sd-server sd-cli
cd "$D/models/sdcpp" \
  && curl -L -C - -O https://huggingface.co/leejet/Z-Image-Turbo-GGUF/resolve/main/z_image_turbo-Q8_0.gguf \
  && curl -L -C - -O https://huggingface.co/unsloth/Qwen3-4B-Instruct-2507-GGUF/resolve/main/Qwen3-4B-Instruct-2507-Q4_K_M.gguf \
  && curl -L -C - -o ae.safetensors https://huggingface.co/Comfy-Org/z_image_turbo/resolve/main/split_files/vae/ae.safetensors
```

## 5. Instalar Ollama y el modelo de textos

```bash
# 1) instala la app desde https://ollama.com/download y ábrela una vez (o: brew install ollama)
ollama pull qwen3:8b
ollama list                 # debe aparecer qwen3:8b
```

Migración sin volver a descargar: copia `~/.ollama/models` del Mac viejo al nuevo (misma ruta) con Ollama cerrado.

## 6. Migrar los datos de trabajo (negocio, fotos, piezas)

Copia **toda** la carpeta `~/Library/Application Support/PostingDay/` al mismo sitio en la máquina nueva con la app cerrada. La base de datos guarda los medios por nombre de archivo (relativo a `media/`), así que fotos, miniaturas, negocio, piezas y claves se conservan tal cual.

Lo único que guarda rutas absolutas son las exportaciones ya hechas (`exports/`): si el usuario del sistema cambia de nombre, basta con volver a pulsar «Exportar» en cada pieza.

Si solo quieres empezar limpio: no copies nada; la app crea una base vacía. Recuerda que en el Mac actual la base contiene el negocio de prueba «Ferretería El Tornillo» y fotos de SENSARTE.

## 7. Windows o Mac Intel: qué funciona

| Pieza | Estado |
|---|---|
| App (Electron, React, SQLite, reels con FFmpeg) | Funciona. FFmpeg: `winget install Gyan.FFmpeg` o un build estático, y `PD_FFMPEG`/`PD_FFPROBE` si no está en el PATH. |
| Captura desde el celular por Wi-Fi | Funciona (el cortafuegos de Windows pedirá permiso). |
| Ollama + qwen3:8b | Funciona (instalador de Windows en ollama.com). Con GPU NVIDIA va rápido; solo CPU, lento. |
| Claude / OpenAI con clave | Funciona igual. |
| Motor local integrado | **No**: el botón solo está activo en Mac Apple Silicon (`engine.supported`). Alternativa manual: descargar de la misma release de stable-diffusion.cpp el zip de Windows (`win-cuda12` para NVIDIA, `win-vulkan` para AMD/Intel, `win-avx2` solo CPU), poner los tres modelos de §3.1 en una carpeta y arrancar `sd-server --diffusion-model z_image_turbo-Q8_0.gguf --vae ae.safetensors --llm Qwen3-4B-Instruct-2507-Q4_K_M.gguf --cfg-scale 1.0 --listen-ip 127.0.0.1 --listen-port 7860`; en la app elegir Imágenes → **«Servidor local externo»** con dirección `http://127.0.0.1:7860`. Sin GPU dedicada es inviable (minutos por imagen). No probado todavía. |
| Draw Things (gratis, API en puerto 7860) | Solo Mac. |

Pendiente de producto (ver `CHECKLIST.md` §6-B): añadir el binario de Windows al instalador integrado.

## 8. Verificar que todo quedó bien

```bash
cd ~/work/postingday/apps/desktop
# 1) autoprueba básica: negocio, importación, textos, post y reel (sin IA real)
PD_SELFTEST=1 pnpm dev
# 2) E2E con IA local: imagen generada → textos con Ollama → post PNG → reel MP4
PD_SELFTEST=1 PD_SELFTEST_TOPIC="destornillador de estría" PD_SD_VERBOSE=1 pnpm dev
```

En la app: Ajustes debe mostrar «Ollama listo con N modelo(s)» y «Instalado» en el motor de imágenes; Biblioteca → «Crear imagen con IA» genera una imagen en ≈ 1-2 min la primera vez (compilación de shaders) y ≈ 90 s después.

## 9. Liberar espacio en el Mac viejo (después de migrar)

Todo lo siguiente se puede volver a descargar o regenerar; nada de esto está en git ni se pierde:

```bash
rm -rf ~/Library/Application\ Support/PostingDay/models/sdcpp   # 8,8 GB (modelos de imagen)
rm -rf ~/Library/Application\ Support/PostingDay/bin/sdcpp      # 98 MB
ollama rm qwen3:8b                                               # ≈ 5 GB
rm -rf ~/work/postingday/node_modules ~/work/postingday/apps/desktop/node_modules   # ≈ 700 MB, vuelve con pnpm install
```

No borres `postingday.db` ni `media/` si aún no los copiaste: son los únicos datos que no se pueden regenerar.
