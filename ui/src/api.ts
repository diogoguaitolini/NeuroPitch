import type { BrainMeshData, Demo, Report, TermMaps } from './types'
import type { CognitiveProfile, TranscriptSegment } from './types'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json() as Promise<T>
}

export const api = {
  demos:      ()                      => get<Demo[]>('/demos.json'),
  report:     (id: string)            => get<Report>(`/sessions/${id}/report.json`),
  profile:    (id: string, n: number) => get<CognitiveProfile>(`/sessions/${id}/iter_${n}/profile.json`),
  transcript: (id: string, n: number) => get<TranscriptSegment[]>(`/sessions/${id}/iter_${n}/transcript.json`),
  audioUrl:   (id: string, n: number) => `/sessions/${id}/iter_${n}/audio.mp3`,
}

// Static brain assets (served from ui/public/)
export async function loadBrainMesh(): Promise<BrainMeshData> {
  const res = await fetch('/brain_mesh.json')
  if (!res.ok) throw new Error('Brain mesh not found. Run scripts/export_brain_assets.py first.')
  return res.json() as Promise<BrainMeshData>
}

export async function loadTermMaps(): Promise<TermMaps> {
  const res = await fetch('/term_maps.json')
  if (!res.ok) throw new Error('Term maps not found. Run scripts/export_brain_assets.py first.')
  return res.json() as Promise<TermMaps>
}
