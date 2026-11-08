import type { CSSProperties, JSX } from 'react'
import { CANVAS, type OutputKind, type TemplateKind } from '@shared/formats'
import type { PieceTexts } from '@shared/types'

/**
 * Plantillas visuales. Se dibujan a tamaño real (1080×1080 o 1080×1920) y se
 * escalan con CSS, de modo que la misma plantilla sirve para la vista previa
 * pequeña de la galería y para exportar la imagen final (ruta #render).
 */

export interface Brand {
  name: string
  primaryColor: string
  secondaryColor: string
}

export type PreviewTexts = PieceTexts

interface Props {
  kind: TemplateKind
  ratio: OutputKind
  brand: Brand
  /** URLs de fotos (pd-media://…). Si faltan, se dibuja un fondo de marca. */
  photos: string[]
  texts: PreviewTexts
  /** Ancho en píxeles de pantalla al que se muestra */
  width: number
  className?: string
}

const FONT = "'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"

/** Reduce el tamaño de letra cuando el texto es más largo de lo cómodo */
export function fitSize(text: string, base: number, comfortable: number): number {
  const len = text.length
  if (len <= comfortable) return base
  return Math.max(Math.round(base * 0.55), Math.round(base * Math.sqrt(comfortable / len)))
}

export const clamp = (lines: number): CSSProperties => ({
  display: '-webkit-box',
  WebkitLineClamp: lines,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden'
})

export function TemplatePreview({ kind, ratio, brand, photos, texts, width, className }: Props): JSX.Element {
  const base = CANVAS[ratio]
  const scale = width / base.w
  return (
    <div
      className={className}
      style={{ width, height: Math.round(base.h * scale), overflow: 'hidden', borderRadius: 12, flexShrink: 0 }}
    >
      <div
        style={{
          width: base.w,
          height: base.h,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          position: 'relative',
          fontFamily: FONT,
          background: brand.secondaryColor,
          color: '#fff',
          overflow: 'hidden'
        }}
      >
        {kind === 'hero' && <Hero ratio={ratio} brand={brand} photos={photos} texts={texts} />}
        {kind === 'offer' && <Offer ratio={ratio} brand={brand} photos={photos} texts={texts} />}
        {kind === 'compare' && <Compare ratio={ratio} brand={brand} photos={photos} texts={texts} />}
        {kind === 'talk' && <Talk ratio={ratio} brand={brand} photos={photos} texts={texts} />}
        {kind === 'quote' && <Quote ratio={ratio} brand={brand} photos={photos} texts={texts} />}
      </div>
    </div>
  )
}

type PartProps = { ratio: OutputKind; brand: Brand; photos: string[]; texts: PreviewTexts }

/* ---------- piezas comunes ---------- */

function Photo({ url, brand, style }: { url?: string; brand: Brand; style?: CSSProperties }): JSX.Element {
  if (url) {
    return (
      <img
        src={url}
        alt=""
        draggable={false}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', ...style }}
      />
    )
  }
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: `linear-gradient(160deg, ${brand.primaryColor} 0%, ${brand.secondaryColor} 100%)`,
        ...style
      }}
    />
  )
}

function Pill({ children, bg, color = '#fff', size = 36 }: { children: string; bg: string; color?: string; size?: number }): JSX.Element | null {
  if (!children) return null
  return (
    <span
      style={{
        display: 'inline-block',
        background: bg,
        color,
        fontSize: size,
        fontWeight: 700,
        letterSpacing: 2,
        textTransform: 'uppercase',
        padding: `${size * 0.35}px ${size * 0.8}px`,
        borderRadius: 999,
        whiteSpace: 'nowrap'
      }}
    >
      {children}
    </span>
  )
}

function Footer({ brand, cta, dark = false }: { brand: Brand; cta: string; dark?: boolean }): JSX.Element {
  return (
    <div
      style={{
        position: 'absolute',
        left: 64,
        right: 64,
        bottom: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 24
      }}
    >
      <span style={{ fontSize: 40, fontWeight: 600, color: dark ? '#111' : '#fff', opacity: 0.95, ...clamp(1) }}>{brand.name}</span>
      <Pill bg={brand.primaryColor} size={32}>
        {cta}
      </Pill>
    </div>
  )
}

/* ---------- Hero: producto estrella / llegó nuevo ---------- */

function Hero({ ratio, brand, photos, texts }: PartProps): JSX.Element {
  const tall = ratio === 'reel'
  const headlineSize = fitSize(texts.headline, tall ? 112 : 96, 22)
  return (
    <>
      <Photo url={photos[0]} brand={brand} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0) 70%)'
        }}
      />
      <div style={{ position: 'absolute', left: 64, top: tall ? 120 : 64 }}>
        <Pill bg={brand.primaryColor}>{texts.kicker}</Pill>
      </div>
      <div style={{ position: 'absolute', left: 64, right: 64, bottom: tall ? 300 : 190 }}>
        <div style={{ fontSize: headlineSize, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2, ...clamp(3) }}>{texts.headline}</div>
        <div style={{ fontSize: 46, marginTop: 24, opacity: 0.92, lineHeight: 1.25, ...clamp(2) }}>{texts.sub}</div>
      </div>
      <Footer brand={brand} cta={texts.cta} />
    </>
  )
}

/* ---------- Offer: oferta de la semana ---------- */

function Offer({ ratio, brand, photos, texts }: PartProps): JSX.Element {
  const tall = ratio === 'reel'
  const photoTop = tall ? 860 : 520
  const headlineSize = fitSize(texts.headline, tall ? 150 : 118, 14)
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: brand.primaryColor }} />
      <div style={{ position: 'absolute', left: 64, top: tall ? 120 : 64 }}>
        <Pill bg="#fff" color={brand.primaryColor}>
          {texts.kicker}
        </Pill>
      </div>
      <div style={{ position: 'absolute', left: 64, right: 64, top: tall ? 260 : 170 }}>
        <div style={{ fontSize: headlineSize, fontWeight: 900, lineHeight: 0.98, letterSpacing: -4, ...clamp(2) }}>{texts.headline}</div>
        <div style={{ fontSize: 48, marginTop: 28, opacity: 0.95, ...clamp(2) }}>{texts.sub}</div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 64,
          right: 64,
          top: photoTop,
          bottom: 170,
          borderRadius: 48,
          overflow: 'hidden',
          boxShadow: '0 30px 80px rgba(0,0,0,0.35)'
        }}
      >
        <Photo url={photos[0]} brand={{ ...brand, primaryColor: brand.secondaryColor }} />
      </div>
      {texts.badge && (
        <div
          style={{
            position: 'absolute',
            right: 80,
            top: photoTop - 90,
            width: 220,
            height: 220,
            borderRadius: '50%',
            background: brand.secondaryColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: 16,
            fontSize: fitSize(texts.badge, 44, 12),
            fontWeight: 800,
            lineHeight: 1.05,
            transform: 'rotate(-8deg)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
          }}
        >
          {texts.badge}
        </div>
      )}
      <Footer brand={brand} cta={texts.cta} />
    </>
  )
}

/* ---------- Compare: antes y después ---------- */

function Compare({ ratio, brand, photos, texts }: PartProps): JSX.Element {
  const tall = ratio === 'reel'
  const halves: CSSProperties[] = tall
    ? [
        { position: 'absolute', left: 0, right: 0, top: 0, height: '50%' },
        { position: 'absolute', left: 0, right: 0, bottom: 0, height: '50%' }
      ]
    : [
        { position: 'absolute', top: 0, bottom: 0, left: 0, width: '50%' },
        { position: 'absolute', top: 0, bottom: 0, right: 0, width: '50%' }
      ]
  return (
    <>
      {halves.map((style, i) => (
        <div key={i} style={{ ...style, overflow: 'hidden' }}>
          <Photo url={photos[i]} brand={i === 0 ? { ...brand, primaryColor: '#475569' } : brand} />
          <div style={{ position: 'absolute', left: 48, top: 48 }}>
            <Pill bg={i === 0 ? 'rgba(15,23,42,0.75)' : brand.primaryColor} size={40}>
              {i === 0 ? (texts.labelA ?? 'A') : (texts.labelB ?? 'B')}
            </Pill>
          </div>
        </div>
      ))}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '48px 64px 140px',
          background: 'linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0))'
        }}
      >
        <div style={{ fontSize: fitSize(texts.headline, 84, 18), fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, ...clamp(2) }}>
          {texts.headline}
        </div>
        <div style={{ fontSize: 42, marginTop: 16, opacity: 0.9, ...clamp(2) }}>{texts.sub}</div>
      </div>
      <Footer brand={brand} cta={texts.cta} />
    </>
  )
}

/* ---------- Talk: cómo se usa / pregunta frecuente / detrás de cámaras ---------- */

function Talk({ ratio, brand, photos, texts }: PartProps): JSX.Element {
  const tall = ratio === 'reel'
  return (
    <>
      <Photo url={photos[0]} brand={brand} />
      <div style={{ position: 'absolute', left: 64, top: tall ? 120 : 64 }}>
        <Pill bg={brand.primaryColor}>{texts.kicker}</Pill>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 64,
          right: 64,
          bottom: tall ? 330 : 200,
          background: 'rgba(255,255,255,0.96)',
          color: '#0f172a',
          borderRadius: 40,
          padding: '48px 56px',
          boxShadow: '0 30px 80px rgba(0,0,0,0.35)'
        }}
      >
        <div style={{ fontSize: fitSize(texts.headline, tall ? 80 : 68, 26), fontWeight: 800, lineHeight: 1.08, letterSpacing: -1.5, ...clamp(3) }}>
          {texts.headline}
        </div>
        <div style={{ fontSize: 42, marginTop: 20, color: '#475569', lineHeight: 1.3, ...clamp(2) }}>{texts.sub}</div>
      </div>
      {tall && texts.badge && (
        <div
          style={{
            position: 'absolute',
            left: 64,
            right: 64,
            bottom: 190,
            textAlign: 'center',
            fontSize: 52,
            fontWeight: 700,
            textShadow: '0 4px 20px rgba(0,0,0,0.6)'
          }}
        >
          <span style={{ background: brand.primaryColor, padding: '8px 24px', borderRadius: 16 }}>{texts.badge}</span>
        </div>
      )}
      <Footer brand={brand} cta={texts.cta} />
    </>
  )
}

/* ---------- Quote: testimonio ---------- */

function Quote({ brand, photos, texts }: PartProps): JSX.Element {
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: '#ffffff' }} />
      <div style={{ position: 'absolute', left: 0, top: 0, right: 0, height: 28, background: brand.primaryColor }} />
      <div style={{ position: 'absolute', left: 64, top: 90, fontSize: 320, lineHeight: 0.8, fontWeight: 900, color: brand.primaryColor, opacity: 0.25 }}>
        “
      </div>
      <div style={{ position: 'absolute', left: 64, right: 64, top: 250, color: '#0f172a' }}>
        <div style={{ fontSize: 40, letterSpacing: 6, color: '#f59e0b' }}>★★★★★</div>
        <div style={{ fontSize: fitSize(texts.headline, 72, 60), fontWeight: 700, lineHeight: 1.15, marginTop: 32, letterSpacing: -1, ...clamp(5) }}>
          {texts.headline}
        </div>
      </div>
      <div style={{ position: 'absolute', left: 64, bottom: 190, display: 'flex', alignItems: 'center', gap: 32 }}>
        <div style={{ width: 150, height: 150, borderRadius: '50%', overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
          <Photo url={photos[0]} brand={brand} />
        </div>
        <div style={{ color: '#0f172a' }}>
          <div style={{ fontSize: 44, fontWeight: 700 }}>{texts.sub}</div>
          <div style={{ fontSize: 36, color: '#64748b', marginTop: 6 }}>{texts.kicker}</div>
        </div>
      </div>
      <Footer brand={brand} cta={texts.cta} dark />
    </>
  )
}
