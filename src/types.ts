/** Monday = 0 … Sunday = 6 */
export type DayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type BlockKind = 'class' | 'work' | 'meeting' | 'commute' | 'other'

/** A recurring weekly busy block. Times are minutes since midnight. */
export interface BusyBlock {
  id: string
  day: DayIndex
  start: number
  end: number
  kind: BlockKind
  /** Class names are private: they are never shown to friends. */
  label?: string
}

export interface WeeklySchedule {
  blocks: BusyBlock[]
  source: 'simulated-import' | 'manual'
}

export type ActivityPref = 'anything' | 'food' | 'active' | 'staying-in' | 'low-key'
export type Budget = 'free' | 'under15' | 'under30' | 'any'
export type Energy = 'chill' | 'social' | 'active'

/** "Free and down to hang" for one window. Expires when the window ends. */
export interface Status {
  id: string
  personId: string
  mode: 'now' | 'later'
  /** Local date, YYYY-MM-DD */
  date: string
  start: number
  end: number
  activity: ActivityPref
  budget: Budget
  energy: Energy
  note?: string
}

export interface Person {
  id: string
  name: string
  initials: string
  color: string
  email: string
  interests: string[]
}

/** A friend as returned by the (mock) server: free/busy only, no class names. */
export interface FriendRecord extends Person {
  schedule: BusyBlock[]
}

export type FriendshipState = 'accepted' | 'incoming' | 'outgoing'

export interface Friendship {
  personId: string
  state: FriendshipState
}

export type Rsvp = 'going' | 'not_going' | 'waiting'

export type ReminderPref = 'day_before' | 'two_hours_before'

export interface Invitee {
  personId: string
  rsvp: Rsvp
}

export interface Plan {
  id: string
  title: string
  location: string
  date: string
  start: number
  end: number
  cost: string
  transport: string
  note: string
  leaderId: string
  invitees: Invitee[]
  activityId?: string
  inviteToken: string
  createdAt: string
  reminders: ReminderPref[]
}

export type TimeOfDay = 'morning' | 'afternoon' | 'evening'

export interface Activity {
  id: string
  name: string
  place: string
  area: string
  category: Exclude<ActivityPref, 'anything'>[]
  energy: Energy[]
  interests: string[]
  minMinutes: number
  maxMinutes: number
  costMin: number
  costMax: number
  costLabel: string
  bestFor: string
  transport: string
  times: TimeOfDay[]
  art: ActivityArt
}

export type ActivityArt =
  | 'film'
  | 'bowling'
  | 'mall'
  | 'paddle'
  | 'coffee'
  | 'village'
  | 'beach'
  | 'food'
  | 'thrift'
  | 'games'
  | 'harbor'
  | 'trail'
  | 'boba'
  | 'cooking'

export interface UserProfile {
  id: 'me'
  name: string
  initials: string
  color: string
  email: string
  commuter: boolean
  town: string
  interests: string[]
  /** Energy resets at midnight: only valid when `date` is today. */
  energy?: { level: Energy; date: string }
}

export interface Session {
  userId: string
  email: string
  verified: boolean
}

export type OnboardingStep = 'schedule' | 'review' | 'interests' | 'done'

export interface AppData {
  version: 1
  session: Session | null
  onboarding: OnboardingStep
  profile: UserProfile | null
  schedule: WeeklySchedule | null
  status: Status | null
  plans: Plan[]
  friendships: Friendship[]
  blocked: string[]
  /** People invited by email who are not in the sample directory. */
  extraPeople: Person[]
  /** ISO timestamp the demo clock is pinned to, or null for real time. */
  demoClock: string | null
}
