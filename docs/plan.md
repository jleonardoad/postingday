# Plan: PostingDay — app de escritorio con IA para el contenido en redes de pymes

> **Nombre decidido el 2026-11-07: PostingDay.** Dominios libres ese día: `postingday.com`, `.app`, `.ai`, `postingdays.com`, `getpostingday.com`, `postingdayapp.com`. Usuario `@postingday`: libre en TikTok, ocupado en YouTube (usar `@postingdayapp`), Instagram y Facebook por verificar en el navegador. Sin marca registrada exacta encontrada en búsqueda web; búsqueda USPTO pendiente.
>
> Fecha: 2026-11-07. Elaborado a partir de tus respuestas (pymes, app de escritorio, tú programas, todas las plataformas, todos los estilos de vídeo, inglés y español) y de una verificación de condiciones de API y precios hecha ese día. Las cifras de terceros cambian: están marcadas con la fuente y conviene reconfirmarlas antes de presupuestar.

---

## 0. Resumen en diez líneas

1. **Producto:** una app de escritorio (Mac/Windows) donde un negocio local carga sus fotos y clips, la IA le propone un plan mensual, produce posts y reels con su marca (texto, música, voz, subtítulos), y los publica programados en Instagram, Facebook, TikTok y YouTube. El dueño solo aprueba.
2. **Cliente:** pymes (restaurantes, clínicas, barberías, talleres, tiendas) en español e inglés; primero pilotos que puedas tratar en persona.
3. **Arquitectura:** app de escritorio **más un servicio pequeño en la nube («Hub»)**. Sin el Hub no se puede publicar automáticamente, ni cobrar, ni incluir la IA en el precio (sección 2).
4. **Stack:** Electron + TypeScript + React; FFmpeg para vídeo; Supabase como Hub. Un solo lenguaje para todo.
5. **IA:** créditos incluidos en la suscripción; tus claves viven en el Hub, nunca en el instalador. Costo real por cliente: **6-10 USD/mes** frente a un precio de 59 USD (sección 6).
6. **Publicación:** en la fase 1 se delega en una API intermediaria ya auditada por las plataformas (Upload-Post, ~2-5 USD por cliente/mes). En paralelo pides tus propias aprobaciones a Meta, TikTok y Google, que tardan semanas, y migras en la fase 3.
7. **MVP (semanas 3-10):** 1 negocio por cuenta, posts e reels con material propio e imágenes IA, plan mensual, cola de aprobación, publicación programada en las 4 redes principales. Todo lo demás, después.
8. **Precio sugerido:** 29 / 59 / 149 USD al mes (Starter / Pro / Agencia), con precio regional para Latinoamérica.
9. **Prerrequisitos desde Venezuela:** una LLC en EE. UU. resuelve Stripe, banco, Apple Developer y la firma de la app para Windows (sección 7). Arrancarlo en la semana 1 porque tarda.
10. **Meta a 6 meses:** 30-50 clientes de pago (2-3 K USD de ingreso mensual recurrente), con pilotos pagando desde el mes 3.

---

## 1. El producto

**Promesa:** «Publica todos los días en tus redes sin contratar a nadie: tú grabas con el celular, la app hace el resto».

**El ciclo que vive el cliente:**

1. **Onboarding (10 min):** perfil del negocio: qué vende, a quién, tono, idioma (ES/EN/ambos), logo, colores, horarios, productos estrella, qué no decir. Es la versión en formulario de tu `contexto-maestro.md`.
2. **Plan mensual:** la IA propone 20-30 ideas con gancho, formato y red destino, repartidas en el calendario. El dueño quita y pone.
3. **Material:** para cada idea la app dice qué hace falta: «graba estas 4 tomas con el celular» (lista de tomas como tu `guia-grabacion-reel01.md`), «elige 3 fotos de la biblioteca», o «lo genero con IA».
4. **Producción:** la app arma la pieza con plantillas de la marca: post con imagen, carrusel, reel vertical con texto animado, música, voz en off opcional y subtítulos. Exporta 9:16, 1:1 y 16:9.
5. **Aprobación:** cola con vista previa; un clic aprueba, otro pide cambios («más corto», «sin precio»). Por defecto nada se publica sin aprobar; hay un modo «piloto automático» para quien lo pida.
6. **Publicación:** programada, aunque el ordenador esté apagado (de eso se ocupa el Hub). Registro de qué salió, dónde y cuándo.
7. **Fase 3:** resumen semanal de resultados que retroalimenta el plan del mes siguiente (tu skill `analista-metricas`).

**Captura desde el móvil:** el dueño graba con el teléfono; para que no tenga que pasar archivos a mano, el Hub ofrece una página web móvil mínima donde sube fotos y clips que aparecen en la app. Sin esto, una app de escritorio pierde a la mitad de los clientes en la primera semana.

**Principios de interfaz (fijados por el usuario el 2026-11-07):**

1. **Lo más simple posible y apto para cualquiera** («family friendly»): nada de jerga, una acción principal por pantalla, botones que dicen lo que hacen.
2. **Explicado sobre la marcha:** cada pantalla dice en una o tres líneas qué hace y qué pasa después («Así funciona: 1-2-3»). Sin manuales.
3. **Vista previa antes de elegir:** el cliente elige el tipo de contenido viendo cómo quedaría con *sus* colores, *su* nombre y *sus* fotos (galería de formatos en «Crear»). Las vistas previas son las mismas plantillas que generan la pieza final.
4. **La app genera todo:** texto, imagen y vídeo. El cliente aporta material y aprueba; nunca tiene que redactar ni diseñar.

**Diferencial frente a Metricool/Later/Buffer + ChatGPT:** ellos programan lo que tú ya produjiste; esta app produce. Frente a los generadores de vídeo con IA genéricos: aquí el núcleo son las fotos y clips reales del negocio con su marca, no vídeo de stock. Para un negocio local, lo real convierte; lo genérico se ignora.

---

## 2. Decisiones de arquitectura

### 2.1 App de escritorio + Hub en la nube (no una app 100 % local)

Pediste «descargar e instalar». Se respeta, pero una app totalmente local **no puede** hacer tres de las cosas que vendes:

| Necesidad | Por qué exige un servidor |
|---|---|
| Conectar las redes del cliente (OAuth) | Meta, TikTok y Google intercambian el código de autorización usando el *secreto* de tu app. Si lo metes en el instalador, cualquiera lo extrae y publica en nombre de tu app. |
| Publicar a la hora programada | Si el portátil del cliente está cerrado a las 7 p. m., alguien tiene que publicar. |
| Incluir la IA en el precio | Las claves de Claude, ElevenLabs, etc. no pueden ir en el instalador. El Hub recibe la petición, descuenta créditos y llama al proveedor. |
| Licencias y cobro | Validar quién pagó y cuánto puede generar. |

**Reparto de trabajo:**

- **App de escritorio:** perfil del negocio, biblioteca de medios, editor y vistas previas, **render de vídeo con FFmpeg en el ordenador del cliente** (cero costo de servidores en lo más pesado), cola de aprobación, instaladores con actualización automática.
- **Hub (Supabase):** autenticación y licencias, contador de créditos, proxy de IA, conexión de redes, cola de publicación programada, almacenamiento temporal del vídeo final hasta publicarlo, webhooks de pago, página móvil de captura.

**Puerta de salida:** si en los pilotos la instalación resulta una barrera, la misma interfaz React se sirve como web app y el render pasa a un servidor. La decisión de hoy no te encierra.

### 2.2 Stack (elegido para minimizar lo nuevo que aprender)

| Capa | Elección | Motivo |
|---|---|---|
| Escritorio | **Electron** (plantilla `electron-vite`) + React + TypeScript + Tailwind | Mayor comunidad y más ejemplos para apps de escritorio; Node da acceso a archivos y procesos sin aprender Rust. Alternativa: Tauri 2 (binarios más pequeños, exige Rust); descartada por ahora. |
| Instaladores y actualizaciones | `electron-builder` (DMG, NSIS) + `electron-updater` sirviendo desde Cloudflare R2 o S3 | Estándar probado. |
| Vídeo | **FFmpeg** empaquetado (`ffmpeg-static`, build LGPL) + subtítulos ASS (libass) | Sin licencias raras. Las **plantillas de marca se diseñan en HTML/CSS**, el propio Chromium de Electron las renderiza a PNG y FFmpeg las compone sobre las fotos/clips. Así cambiar una plantilla es editar CSS. |
| Datos locales | SQLite (`better-sqlite3`) | Biblioteca, borradores, calendario, registro de publicaciones. |
| Hub | **Supabase**: Postgres + Auth + Storage + Edge Functions (TypeScript) + `pg_cron` | Todo en TypeScript; gratis durante los pilotos, 25 USD/mes después. |
| Pagos | Stripe (vía LLC) o un *merchant of record* (sección 7) | |
| Texto IA | **Claude Opus 5.5** (`claude-opus-5-5`, 4 USD / 20 USD por millón de tokens de entrada / salida) | El costo por pieza es de centavos (sección 4), no hace falta bajar de modelo. |
| Voz | ElevenLabs Flash (español e inglés de calidad) con OpenAI TTS como respaldo barato | |
| Imágenes | Ideogram o gpt-image (los que mejor escriben texto dentro de la imagen: promos, menús) | |
| Stock | Pexels API (gratis) | |
| Publicación | Adaptador con dos implementaciones: **Upload-Post** (fase 1) y **APIs propias** (fase 3) | Poder cambiar de proveedor en una semana. |

### 2.3 Modelo de costos de IA: créditos incluidos (recomendación)

- **Descartado BYOK para pymes:** un dueño de restaurante no va a crear cuenta en Anthropic y pegar claves. BYOK queda como opción futura para agencias.
- **Elegido:** cada plan incluye una cuota de piezas al mes (p. ej. 60); el Hub descuenta por generación y corta al llegar al límite con opción de comprar un paquete extra. Tus claves solo viven en el Hub.
- **Control:** límites duros por cliente y por día, alertas de consumo anómalo, y una tabla `usage` que te dice cuánto cuesta cada cliente de verdad.

---

## 3. Alcance por fases

Elegiste todas las plataformas y los cuatro estilos de vídeo. Todo cabe en el producto, pero no en la primera versión. La regla: **el MVP es lo mínimo con lo que 5 negocios publican cada semana sin tu ayuda.**

### MVP (fase 1) — entra

- 1 negocio por cuenta; perfil del negocio; biblioteca de medios; captura desde el móvil (página web mínima).
- Plan mensual generado; ideas con gancho y lista de tomas para grabar.
- **Posts con imagen:** foto propia o imagen IA + texto + hashtags; carrusel simple.
- **Reels a partir de fotos y clips propios:** plantillas de marca, texto animado, música, voz IA opcional, subtítulos automáticos. 9:16 y 1:1.
- Cola de aprobación; programación; publicación en **Instagram (feed y reels), Facebook (página), TikTok y YouTube Shorts** vía Upload-Post.
- Interfaz en español e inglés desde el día 1 (`react-i18next`); contenido en el idioma del negocio o bilingüe.
- Instaladores Mac y Windows con actualización automática; inicio de sesión con licencia.

### Fase 2 — pilotos pagando

- **Modo stock** (guion → clips de Pexels → voz → subtítulos): se porta la lógica de MoneyPrinterTurbo a TypeScript. Es el plan B para negocios con pocas fotos.
- Google Business Profile y LinkedIn (vía intermediario).
- Más plantillas por sector (restaurante, salud, belleza, servicios, tienda).
- Dashboard simple: qué se publicó, qué está pendiente.
- Cobro, landing bilingüe, referidos.

### Fase 3 — escalar y diferenciar

- Integraciones propias con Meta, TikTok y YouTube (cuando lleguen las aprobaciones) para bajar costo y dependencia.
- **Avatar IA** (HeyGen) como complemento de pago.
- **YouTube largo** (5-10 min): guion por escenas, b-roll, capítulos. Es otro pipeline, no una extensión del de reels.
- Multinegocio para agencias; analítica y «qué funcionó» (skill `analista-metricas`); X como complemento (pago por uso); BYOK opcional.

### Lista «no ahora» (para que no se cuele)

Edición manual tipo CapCut, respuestas a comentarios y mensajes, pauta paga, marketplace de plantillas, app móvil nativa, colaboración multiusuario, marca blanca.

---

## 4. Motor de contenido: proveedores y costo por pieza

| Pieza | Proveedor | Costo aproximado | Fuente |
|---|---|---|---|
| Texto (caption, guion, ideas, hashtags) | Claude Opus 5.5 — 4 USD / 20 USD por M tokens | 0,01-0,03 USD por pieza; un plan mensual completo 0,10-0,30 USD | tabla de precios de Anthropic (caché 2026-10-06) |
| Voz en off de 30 s (~450 caracteres) | ElevenLabs Flash 0,04 USD/1 000 car.; modelos premium 0,08 USD | 0,02-0,04 USD | [ElevenLabs API pricing](https://www.goodvibecode.com/text-to-speech/elevenlabs-api-pricing-explained) |
| Voz en off, respaldo barato | OpenAI tts-1 15 USD/M car.; tts-1-hd 30 USD/M | 0,007-0,015 USD | [OpenAI TTS pricing](https://costgoat.com/pricing/openai-tts) |
| Imagen IA 1024×1024 | Ideogram 4.0 Turbo 0,03 USD, Default 0,06; Flux 2 Pro ~0,055; gpt-image-2 de 0,006 a 0,21 según calidad | 0,03-0,06 USD | [comparativa de precios por imagen](https://invideo.io/blog/ai-image-model-pricing/) |
| Clips de stock | Pexels API | 0 USD | |
| Subtítulos de un clip hablado | OpenAI Whisper (~0,006 USD/min, verificar) o marcas de tiempo de ElevenLabs | < 0,01 USD | |
| Avatar IA, 30 s | HeyGen API: Avatar III 0,60-0,99 USD/min; Avatar IV 2,31-4,83; Avatar V 7,20 USD/min | 0,30-0,50 USD con Avatar III | [HeyGen pricing](https://diyai.io/ai-tools/video-generation/heygen-pricing/) |
| Publicación | Upload-Post: 24 USD/mes 5 perfiles; 50 USD/mes 25 perfiles (un perfil = un cliente con una cuenta por red) | 2-5 USD por cliente/mes | [Upload-Post pricing](https://www.blotato.com/blog/upload-post-pricing) |
| Post en X | X API pago por uso | 0,015 USD por post; 0,20 USD si lleva enlace | [X API pricing](https://www.outstand.so/blog/x-api-pricing) |

**Costo mensual de un cliente Pro** (60 piezas: 20 reels con voz, 20 posts con imagen IA, 20 posts con fotos propias, con regeneraciones):

| Concepto | USD/mes |
|---|---|
| Texto (Claude) | 1,5 |
| Voz (ElevenLabs) | 0,6 |
| Imágenes (con 2 regeneraciones de media) | 2,0 |
| Publicación (Upload-Post) | 2-5 |
| Almacenamiento y tráfico | 0,5 |
| **Total** | **≈ 6-10** |

Con un precio de 59 USD el margen bruto ronda el 85 %. El avatar no entra en el plan base: 10 vídeos con avatar cuestan ~5 USD y se venden como complemento de 19 USD.

**Música:** no se puede usar la biblioteca musical de Instagram/TikTok vía API; el vídeo debe llevar su propio audio. Opciones: un paquete de 20-30 pistas con licencia que permita distribuirlas dentro de software (leer la licencia: muchas «royalty-free» prohíben redistribuir), o generación con IA (p. ej. la API de música de ElevenLabs). Decidirlo en el sprint 3.

**Biblioteca de prompts:** tus seis `.skill` (son archivos zip con un `SKILL.md`) se extraen y se convierten en prompts versionados del motor: `guiones-reels` → guiones; `calendario-contenido` → plan mensual; `trial-reels` → variantes de gancho; `research-competencia` → onboarding por sector; `lead-magnet` → ofertas; `analista-metricas` → fase 3.

---

## 5. Publicación: reglas por plataforma y estrategia

Lo verificado el 2026-11-07 (los plazos de revisión son estimaciones de terceros):

| Plataforma | Con tu propia app | Con intermediario auditado |
|---|---|---|
| Instagram y Facebook | Cuenta Business/Creator ligada a una página; **App Review por cada permiso** (2-4 semanas según terceros); límite de 100 publicaciones por API cada 24 h por cuenta. [Meta](https://developers.facebook.com/documentation/instagram-platform/content-publishing) · [guía](https://www.blotato.com/blog/instagram-posting-api) | Inmediato |
| TikTok | **Sin auditoría solo se publica en privado**, o como borrador en la bandeja de la app del dueño (él publica a mano en 24 h). Auditoría: 2-6 semanas según terceros. [TikTok](https://developers.tiktok.com/docs/en/content-posting-api-reference-photo-post) · [guía](https://www.rapidevelopers.com/md/api-automations/how-to-automate-tiktok-video-posting-using-the-api) | Público desde el primer día |
| YouTube | Cuota de 10 000 unidades/día **por proyecto** y cada subida cuesta 1 600 → **~6 subidas al día para todos tus clientes juntos** hasta que Google amplíe la cuota; sin verificación de la app los vídeos quedan privados. [Google](https://Developers.Google.com/youtube/v3/docs/videos/insert) · [cuotas](https://developers.google.com/youtube/v3/determine_quota_cost?authuser=1) | Inmediato (cuota del proveedor) |
| Google Business Profile | Solicitud de acceso, revisión ~14 días, cuota 0 hasta aprobación. [Google](https://developers.google.com/my-business/content/prereqs?authuser=3) · [guía](https://slashpost.ai/blogs/google-business-profile/google-business-profile-api-documentation-2026) | Inmediato si el proveedor lo cubre (Upload-Post lo lista) |
| LinkedIn | Perfil personal sin aprobación; páginas de empresa exigen aprobación de partner | Inmediato |
| X | Pago por uso desde feb. 2026, sin plan gratuito. [X pricing](https://www.outstand.so/blog/x-api-pricing) | El proveedor repercute el costo |

**Estrategia:**

1. **Fase 1: Upload-Post** como motor de publicación. Un «perfil» es un cliente con una cuenta por red; programación hasta 365 días; cubre TikTok, Instagram, Facebook, YouTube, LinkedIn, X, Threads, Pinterest y Google Business Profile ([docs](https://docs.upload-post.com/api/reference/) · [plataformas](https://www.upload-post.com/social-media-api/)). Alternativas si falla: Zernio (antes Late; 2 cuentas gratis, luego 6 USD por cuenta hasta la 10.ª y 3 USD hasta la 100.ª; cobra por cuenta social, así que un cliente con 4 redes sale más caro — [precios](https://droidcrunch.com/zernio-pricing/)), Post Bridge, o Ayrshare si creces mucho (149 USD/mes por 1 perfil, 599 USD por 30 — [precios](https://www.upload-post.com/ayrshare-pricing/)). Postiz es de código abierto (AGPL) y se puede autoalojar, pero entonces las aprobaciones de las plataformas vuelven a ser tuyas ([Postiz](https://postiz.com/)).
2. **Semana 1, en paralelo:** crear tu app en Meta for Developers, en TikTok for Developers y un proyecto en Google Cloud (YouTube Data API y Business Profile API), con términos de uso y política de privacidad publicados (los exigen). Pedir las revisiones ya, aunque no las uses hasta la fase 3.
3. **Riesgo del intermediario:** son empresas pequeñas. Por eso el adaptador de publicación es una interfaz con dos implementaciones y el Hub guarda los vídeos finales: cambiar de proveedor es trabajo de una semana, no de un mes.
4. **Higiene:** aprobación humana por defecto, nunca más de N publicaciones por día por cuenta, sin texto idéntico en varias redes el mismo día. Las plataformas penalizan lo que parece automatizado.

---

## 6. Modelo de negocio

**Precios sugeridos (USD/mes, IVA aparte):**

| Plan | Precio | Incluye |
|---|---|---|
| Starter | 29 | 1 negocio, 2 redes, 20 piezas/mes, plantillas básicas |
| Pro | 59 | 1 negocio, todas las redes, 60 piezas/mes, plan mensual automático, voz IA, subtítulos |
| Agencia | 149 | 5 negocios, todo lo de Pro |
| Complementos | 19 | Avatar IA (10 vídeos/mes); paquete de 30 piezas extra |

- **Precio regional** para Latinoamérica (p. ej. 19 / 39 USD) y precio completo en EE. UU. La app es la misma; cambia la lista de precios según país de facturación.
- **Pilotos:** 60 días gratis a cambio de una llamada quincenal y de poder citar su caso; después, plan Pro con 50 % el primer año si siguen.
- **Servicio de arranque** (opcional, 99 USD): tú haces el onboarding y el primer mes de plan con el cliente. Para pymes que no quieren tocar nada; también es tu mejor fuente de aprendizaje.
- **Referidos:** un mes gratis por cada negocio que traigan y se quede.

**Costos fijos durante las fases 1-2 (además de tu Claude Max):**

| Concepto | USD/mes |
|---|---|
| Supabase | 0 en pilotos; 25 después |
| Upload-Post | 24-50 |
| Dominio, landing, correo | 10-15 |
| APIs de IA (5-10 pilotos) | 30-80 |
| **Total** | **≈ 70-170** |

**Umbrales:** con 10 clientes Pro (590 USD) cubres costos y las cuotas anuales; con 30-50 (2-3 K USD) el negocio paga tu tiempo. Antes de eso, los pilotos sirven para producto y casos de éxito, no para ingresos.

---

## 7. Prerrequisitos legales, de cobro y de firma (desde Venezuela)

Esto no es burocracia opcional: sin firma, Windows y macOS bloquean el instalador con avisos que espantan a una pyme; sin entidad, no cobras con tarjeta.

| Tema | Situación verificada | Recomendación |
|---|---|---|
| Entidad y cobro | Stripe no opera con negocios en Venezuela. Lemon Squeezy (merchant of record) dice pagar a 110+ países por banco y 200+ por PayPal, pero **no pude confirmar Venezuela** ([docs](https://docs.lemonsqueezy.com/help/getting-started/supported-countries) · [comparativa](https://agentaos.ai/answers/which-merchant-of-record-pays-out-to-my-country)). | **LLC en EE. UU.** (Wyoming o Delaware, vía Stripe Atlas, doola o Firstbase) + Stripe + cuenta bancaria (Mercury/Relay). Es la vía habitual de fundadores venezolanos. Arrancarla en la semana 1; cuesta unos cientos de dólares el primer año (verificar precios actuales). Pilotos en Latinoamérica: Zelle, Binance o pago móvil a mano. |
| macOS | Firmar y notarizar exige el Apple Developer Program (99 USD/año). Hay reportes en los foros de Apple de inscripciones desde Venezuela que no se completan ([hilo](https://developer.apple.com/forums/thread/795566)). | Inscribir a la **LLC** como organización (pide número D-U-N-S, gratis, tarda días). |
| Windows | Azure Artifact Signing (~10 USD/mes) solo acepta individuos de EE. UU./Canadá y organizaciones de EE. UU., Canadá, UE y Reino Unido con historial ([Microsoft](https://learn.microsoft.com/azure/artifact-signing/quickstart) · [resumen](https://learn.microsoft.com/en-sg/windows/msix/package/signing-package-overview)). | Certificado **OV** de una autoridad certificadora a nombre de la LLC (300-500 USD/año). Para los pilotos, instalador sin firmar con instrucciones para pasar el aviso de SmartScreen; no para vender. |
| Términos y privacidad | Meta, TikTok y Google exigen URLs públicas de términos, privacidad y borrado de datos para revisar tu app. | Publicarlas en la landing en la semana 2. Incluir: el cliente garantiza que tiene derechos sobre las fotos y clips que sube. |

---

## 8. Plan de trabajo

Supone ~20 horas por semana tuyas con Claude Code como par. Con menos horas, estira las semanas en proporción; no recortes el alcance del MVP por debajo de lo listado.

### Fase 0 — Validación y cimientos (semanas 1-2)

| Qué | Cómo se verifica |
|---|---|
| Elegir nombre y dominio; landing bilingüe con lista de espera, términos y privacidad | URLs públicas |
| **5 pilotos comprometidos** (3 en español, 2 en inglés): entrevista de 30 min — qué publican hoy, quién lo hace, cuánto pagan, qué les duele; compromiso de 60 días | 5 nombres con fecha de inicio |
| Definir los **6 formatos del MVP** por lo que diga la entrevista (p. ej. «producto estrella», «antes y después», «detrás de cámaras», «oferta de la semana», «pregunta frecuente», «testimonio») | Documento de formatos con ejemplo real de cada uno |
| Cuentas: Upload-Post, Supabase, Anthropic, ElevenLabs, proveedor de imágenes, Pexels; GitHub privado | Claves en un gestor de secretos, no en el repo |
| Apps de desarrollador en Meta, TikTok y Google; solicitar revisiones | Solicitudes enviadas (tardan semanas) |
| Iniciar la LLC | Trámite en curso |

### Fase 1 — MVP (semanas 3-10)

**Sprint 1 (semanas 3-4): esqueleto.** Proyecto Electron con `electron-vite`; inicio de sesión contra el Hub; perfil del negocio (formulario = `contexto-maestro.md`); biblioteca de medios local; página móvil de captura que sincroniza con la app; i18n ES/EN. *Verificación:* instalas en un Mac y un Windows limpios, entras, subes 5 fotos desde el teléfono y aparecen.

**Sprint 2 (semanas 5-6): motor de texto.** Proxy de IA en el Hub con contador de créditos; plan mensual; ideas con gancho; lista de tomas; captions y hashtags en ES/EN; generador de posts con imagen (propia o IA) con plantillas de marca HTML/CSS → PNG. *Verificación:* un piloto real genera su plan de noviembre y 10 posts sin tocar un prompt.

**Sprint 3 (semanas 7-8): motor de vídeo.** Reel a partir de fotos/clips propios: Ken Burns, texto animado, música, voz (ElevenLabs) con subtítulos sincronizados, mezcla de audio, export 9:16 y 1:1 con FFmpeg. Decidir la licencia de música. *Verificación:* 5 reels de 5 negocios distintos que no den vergüenza publicar; render < 60 s en un portátil normal.

**Sprint 4 (semanas 9-10): publicación y empaquetado.** Adaptador Upload-Post; conexión de cuentas; calendario y cola de aprobación; programación; registro de publicaciones; instaladores DMG/NSIS con actualización automática; onboarding guiado. *Verificación:* los 5 pilotos publican desde la app en Instagram, Facebook, TikTok y YouTube Shorts; una actualización llega sola.

**Hito de fase 1:** 5 pilotos publicando ≥ 3 piezas por semana cada uno durante 2 semanas seguidas sin tu intervención.

### Fase 2 — Pilotos → clientes (semanas 11-16)

- Medir cada semana: piezas publicadas, tiempo hasta aprobar, porcentaje de piezas editadas antes de aprobar, piezas rechazadas y por qué, soporte que pidieron.
- Construir: modo stock (port de MoneyPrinterTurbo), Google Business Profile y LinkedIn, plantillas por sector, dashboard.
- Comercial: precios en la landing, cobro, firma de instaladores, referidos, 3 casos de éxito con números.
- **Meta:** 10 clientes de pago (~500 USD/mes), cancelación < 10 % mensual.

### Fase 3 — Escalar (meses 5-6)

- Integraciones propias cuando lleguen las aprobaciones; avatar IA; YouTube largo; multinegocio; analítica; X; BYOK.
- Canales: hispanos en EE. UU. (grupos de Facebook de dueños de negocio por ciudad), alianzas con contadores y agencias pequeñas que atienden pymes, Latinoamérica por referidos.
- **Meta:** 30-50 clientes (2-3 K USD/mes).

---

## 9. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| El intermediario de publicación cierra o cambia precios | Adaptador con dos implementaciones; aprobaciones propias pedidas desde la semana 1; vídeos finales guardados en el Hub |
| Plataformas cambian reglas o penalizan automatización | Aprobación humana por defecto, límites diarios, variación de texto entre redes, publicación desde apps aprobadas |
| No puedes firmar la app desde Venezuela | LLC; pilotos con instaladores sin firmar y guía para el aviso |
| Contenido genérico que el cliente no quiere publicar | Fotos y clips reales como núcleo; plantillas por sector; medir «editado antes de aprobar» y bajar ese número cada sprint |
| Alcance (elegiste todo) | MVP cerrado y lista «no ahora»; cada idea nueva entra a la fase 3 por defecto |
| Costos de IA fuera de control | Cuotas por plan, límites duros por día, tabla de uso por cliente, alertas |
| Música sin licencia | Paquete con licencia de distribución en software o música generada; nunca pistas de las plataformas |
| Derechos sobre lo que suben los clientes | Términos: el cliente garantiza derechos; borrado de datos a petición |
| Un solo desarrollador | Sprints de 2 semanas con verificación real al final; nada de «casi listo» |
| Captura móvil incómoda | Página móvil de captura en el sprint 1; si aun así duele, evaluar web app en la fase 2 |

---

## 10. Métricas por fase

| Fase | Métrica que manda |
|---|---|
| 0 | 5 pilotos con fecha de inicio |
| 1 | 5 pilotos publicando ≥ 3 piezas/semana sin tu ayuda |
| 2 | 10 de pago; % de piezas editadas antes de aprobar < 30 %; cancelación < 10 %/mes |
| 3 | 30-50 de pago; costo de IA por cliente < 10 USD; soporte < 1 h/cliente/mes |

---

## 11. Qué se reutiliza del repo actual

| Activo | Uso en el producto |
|---|---|
| `MoneyPrinterTurbo/` (licencia MIT) | Referencia para portar a TypeScript el pipeline del «modo stock»: guion → términos de búsqueda → clips de Pexels → voz → subtítulos → FFmpeg. No se empaqueta su Python. |
| Las 6 `.skill` | Biblioteca de prompts del motor (sección 4) |
| `contexto-maestro.md` | Formulario de «Perfil del negocio» |
| `guia-grabacion-reel01.md` | Modelo de la función «lista de tomas» |
| `sistema-completo-dropshipping.md`, `analisis-html/` | Quedan como archivo del plan anterior; el embudo reel → afiliado no forma parte de este producto |
| `videos/`, `producto-sensarte/` | Material de prueba para el motor de vídeo |

El producto nuevo debería vivir en su propio repositorio (p. ej. `~/work/<nombre-app>/`) con el Hub y la app de escritorio como dos paquetes de un monorepo.

---

## 12. Próximos pasos: lo que necesito de ti

1. **Nombre del producto** (o tres candidatos; comprobamos dominio y redes).
2. **Lista de 5 negocios candidatos a piloto** con quién es el contacto y en qué idioma publica.
3. **Decisión sobre la LLC:** arrancarla ahora o esperar a tener pilotos. Mi recomendación: ahora, porque todo lo demás (Stripe, Apple, firma) cuelga de ella.
4. **Horas por semana** que puedes dedicar, para fijar las fechas reales.
5. Con eso, el siguiente paso técnico es el sprint 1: crear el repositorio, el esqueleto Electron y el Hub en Supabase. Lo hacemos juntos en una sesión.

---

## Anexo: fuentes consultadas (2026-11-07)

- Meta, publicación de contenido en Instagram: https://developers.facebook.com/documentation/instagram-platform/content-publishing · guía de terceros: https://www.blotato.com/blog/instagram-posting-api
- TikTok Content Posting API (restricción a privado sin auditoría): https://developers.tiktok.com/docs/en/content-posting-api-reference-photo-post · plazos (terceros): https://www.rapidevelopers.com/md/api-automations/how-to-automate-tiktok-video-posting-using-the-api
- YouTube Data API, `videos.insert` y cuotas: https://Developers.Google.com/youtube/v3/docs/videos/insert · https://developers.google.com/youtube/v3/determine_quota_cost?authuser=1
- Google Business Profile API, prerrequisitos: https://developers.google.com/my-business/content/prereqs?authuser=3 · https://slashpost.ai/blogs/google-business-profile/google-business-profile-api-documentation-2026
- Upload-Post: https://docs.upload-post.com/api/reference/ · https://www.upload-post.com/social-media-api/ · precios: https://www.blotato.com/blog/upload-post-pricing
- Zernio (antes Late): https://droidcrunch.com/zernio-pricing/ · Ayrshare: https://www.upload-post.com/ayrshare-pricing/ · Postiz: https://postiz.com/
- HeyGen API: https://diyai.io/ai-tools/video-generation/heygen-pricing/
- ElevenLabs: https://www.goodvibecode.com/text-to-speech/elevenlabs-api-pricing-explained · OpenAI TTS: https://costgoat.com/pricing/openai-tts
- Imágenes IA: https://invideo.io/blog/ai-image-model-pricing/
- X API: https://www.outstand.so/blog/x-api-pricing
- Lemon Squeezy, países: https://docs.lemonsqueezy.com/help/getting-started/supported-countries · comparativa MoR: https://agentaos.ai/answers/which-merchant-of-record-pays-out-to-my-country
- Apple Developer desde Venezuela (foro): https://developer.apple.com/forums/thread/795566
- Firma en Windows: https://learn.microsoft.com/azure/artifact-signing/quickstart · https://learn.microsoft.com/en-sg/windows/msix/package/signing-package-overview
