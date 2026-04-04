import type { BrainMeshData, Demo, Report, SessionInfo, TermMaps } from './types'
import type { CognitiveProfile, TranscriptSegment } from './types'

const BASE = '/api'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(BASE + path)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json() as Promise<T>
}

export const api = {
  sessions:   ()                   => get<SessionInfo[]>('/sessions'),
  report:     (id: string)         => get<Report>(`/sessions/${id}/report`),
  profile:    (id: string, n: number) => get<CognitiveProfile>(`/sessions/${id}/iter/${n}/profile`),
  transcript: (id: string, n: number) => get<TranscriptSegment[]>(`/sessions/${id}/iter/${n}/transcript`),
  audioUrl:   (id: string, n: number) => `${BASE}/sessions/${id}/iter/${n}/audio`,
  demos:      ()                   => get<Demo[]>('/demos'),
  status:     (id: string)         => get<{ status: string; message?: string }>(`/status/${id}`),

  async upload(file: File): Promise<string> {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`${BASE}/upload`, { method: 'POST', body: form })
    if (!res.ok) throw new Error(await res.text())
    const data = await res.json() as { session_id: string }
    return data.session_id
  },

  async iterate(sessionId: string): Promise<void> {
    const res = await fetch(`${BASE}/sessions/${sessionId}/iterate`, { method: 'POST' })
    if (!res.ok) throw new Error(await res.text())
  },
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
