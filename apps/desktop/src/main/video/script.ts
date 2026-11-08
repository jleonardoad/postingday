/**
 * Guion de reel determinista (v1): a partir de los textos de la pieza y del
 * material elegido construye 3-5 escenas de 4-6 s. Más adelante la IA podrá
 * proponer el guion; la estructura es la misma.
 */
import type { ContentFormat } from '@shared/formats'
import type { KenBurns, MediaItem, Piece, ReelScene, ReelScript, SceneRole } from '@shared/types'

const FPS = 30
const MAX_TOTAL = 25
const KB: KenBurns[] = ['in', 'right', 'out', 'left']

export function buildReelScript(piece: Piece, format: ContentFormat, media: MediaItem[], musicName: string | null): ReelScript {
  const chosen = piece.mediaIds.map((id) => media.find((m) => m.id === id)).filter((m): m is MediaItem => Boolean(m))
  const photos = chosen.filter((m) => m.kind === 'image')
  const clips = chosen.filter((m) => m.kind === 'video')
  const t = piece.texts
  const brandCta = { cta: t.cta }

  const roles: { role: SceneRole; texts: ReelScene['texts']; sec: number }[] =
    format.kind === 'compare'
      ? [
          { role: 'labelA', texts: { label: t.labelA ?? 'A', kicker: t.kicker }, sec: 4 },
          { role: 'labelB', texts: { label: t.labelB ?? 'B', headline: t.headline }, sec: 4 },
          { role: 'cta', texts: { headline: t.headline, sub: t.sub, ...brandCta }, sec: 4 }
        ]
      : [
          { role: 'hook', texts: { kicker: t.kicker, headline: t.headline, badge: t.badge }, sec: 4 },
          { role: 'body', texts: { headline: t.headline, sub: t.sub }, sec: 5 },
          { role: 'cta', texts: { sub: t.sub, ...brandCta }, sec: 4 }
        ]

  const scenes: ReelScene[] = []

  if (clips.length > 0) {
    // Un fragmento por clip; si hay menos clips que escenas, se reparten fragmentos distintos del mismo clip
    roles.forEach((r, i) => {
      const clip = clips[i % clips.length]!
      const uses = Math.ceil(roles.length / clips.length)
      const slot = Math.floor(i / clips.length)
      const clipSec = (clip.durationMs ?? 6000) / 1000
      const dur = Math.min(r.sec, Math.max(2, clipSec / uses))
      const start = Math.min(Math.max(0, clipSec - dur), slot * dur)
      scenes.push({ index: i, role: r.role, kind: 'clip', mediaId: clip.id, durationSec: round(dur), clipStartSec: round(start), kenburns: 'none', texts: r.texts })
    })
  } else if (photos.length > 0) {
    roles.forEach((r, i) => {
      // Antes/después: foto A en la primera escena, foto B en las siguientes
      const photo = format.kind === 'compare' ? (photos[i === 0 ? 0 : Math.min(1, photos.length - 1)] ?? photos[0]!) : photos[i % photos.length]!
      scenes.push({ index: i, role: r.role, kind: 'photo', mediaId: photo.id, durationSec: r.sec, clipStartSec: 0, kenburns: KB[i % KB.length]!, texts: r.texts })
    })
  } else {
    roles.forEach((r, i) => {
      scenes.push({ index: i, role: r.role, kind: 'card', mediaId: null, durationSec: r.sec, clipStartSec: 0, kenburns: 'none', texts: r.texts })
    })
  }

  let total = scenes.reduce((s, sc) => s + sc.durationSec, 0)
  if (total > MAX_TOTAL) {
    const k = MAX_TOTAL / total
    for (const sc of scenes) sc.durationSec = round(Math.max(2, sc.durationSec * k))
    total = scenes.reduce((s, sc) => s + sc.durationSec, 0)
  }

  return { width: 1080, height: 1920, fps: FPS, totalSec: round(total), scenes, music: { kind: musicName ? 'file' : 'demo', name: musicName } }
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}
