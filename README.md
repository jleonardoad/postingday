# PostingDay

Contenido para las redes de pymes, creado con IA y publicado solo. Monorepo con pnpm.

**Para retomar el trabajo:** lee [`docs/CHECKLIST.md`](docs/CHECKLIST.md) (estado, cómo probar, hallazgos, pendientes) y [`docs/plan.md`](docs/plan.md) (plan de producto).
**Para instalar en otra máquina** (requisitos, modelos de IA, migración de datos y modelos, Windows): [`docs/INSTALACION.md`](docs/INSTALACION.md).

```
apps/desktop   App de escritorio (Electron + React + TypeScript)
packages/      Código compartido (Hub, motor de contenido) — se añade en sprints siguientes
docs/plan.md   Plan de producto y de trabajo
```

## Desarrollo

Requisitos: Node 22+, pnpm 10, FFmpeg en el PATH (en macOS: `brew install ffmpeg`).

```bash
pnpm install
pnpm dev                      # abre la app con recarga en caliente
pnpm --filter @postingday/desktop typecheck
```

Variables de entorno para verificar sin tocar la interfaz (todas opcionales):

```bash
# Captura la ventana y cierra la app
PD_SCREENSHOT=/tmp/postingday.png PD_SCREENSHOT_DELAY=2500 pnpm dev
# Abre directamente una vista: home | create[/formato] | pieces | piece/<id> | profile | library[/capture|/image] | settings
PD_VIEW=library pnpm dev
# E2E completo de un producto sin foto: imagen con IA → textos → post PNG → reel MP4
PD_SELFTEST=1 PD_SELFTEST_TOPIC="destornillador de estría" pnpm dev
# Lista completa de variables (motor de imágenes, Claude, Ollama, teléfono): docs/CHECKLIST.md §3
# Autoprueba del proceso principal (guarda un negocio de ejemplo, importa archivos, lee la BD)
PD_SELFTEST=1 PD_IMPORT_FILES=/ruta/foto.jpg,/ruta/clip.mp4 pnpm dev
# Forzar binarios concretos de FFmpeg
PD_FFMPEG=/opt/homebrew/bin/ffmpeg PD_FFPROBE=/opt/homebrew/bin/ffprobe pnpm dev
```

Nota pnpm 10: los scripts de instalación de dependencias están bloqueados por defecto; `electron`
está autorizado en `pnpm.onlyBuiltDependencies` del `package.json` raíz. Si tras instalar aparece
«Electron uninstall», ejecuta `pnpm rebuild electron` (o `node node_modules/electron/install.js`).

Los datos del usuario (base SQLite, fotos importadas, miniaturas, exportaciones, música y el motor
local de imágenes con sus modelos) viven en la carpeta `userData` de Electron
(`~/Library/Application Support/PostingDay` en macOS). Se muestra en Ajustes. Detalle en `docs/CHECKLIST.md` §4.
