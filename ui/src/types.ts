export interface CognitiveProfile {
  attention:          number[]
  arousal:            number[]
  reward:             number[]
  surprise:           number[]
  emotion:            number[]
  social:             number[]
  valence:            number[]
  'self-referential': number[]
  language:           number[]
  speech:             number[]
  imagery:            number[]
  'working memory':   number[]
  [key: string]:      number[]
}

export interface TranscriptSegment {
  text:  string
  start: number
  end:   number
}

export interface DiffEntry {
  type:   'replace' | 'insert' | 'delete'
  before: string
  after:  string
}

export interface Report {
  session_id:         string
  n_iterations:       number
  reward_history:     number[]
  improvement_pct:    number
  transcript_v1:      TranscriptSegment[]
  transcript_vfinal:  TranscriptSegment[]
  diff:               DiffEntry[]
}

export interface SessionInfo {
  id:           string
  has_report:   boolean
  n_iterations: number
  report:       Report | null
}

export type PhraseScores = Record<string, number>

export interface Demo {
  id:              string
  session_id:      string
  title:           string
  subtitle:        string
  context:         string
  duration:        string
  improvement_pct: number
}

export interface BrainMeshData {
  positions: number[]
  indices:   number[]
  sulcal:    number[]
  n_left:    number
  n_right:   number
}

export type TermMaps = Record<string, number[]>
