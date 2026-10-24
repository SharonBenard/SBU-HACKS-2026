import type {
  AppData,
  Energy,
  OnboardingStep,
  Person,
  Plan,
  Rsvp,
  Session,
  Status,
  UserProfile,
  WeeklySchedule,
} from '../types'
import { SEED_FRIENDSHIPS, samplePlans } from '../data/sampleData'
import { initialsOf } from '../lib/ids'

export type Action =
  | { type: 'signIn'; session: Session; name: string }
  | { type: 'setOnboarding'; step: OnboardingStep }
  | { type: 'setSchedule'; schedule: WeeklySchedule }
  | { type: 'updateProfile'; patch: Partial<Omit<UserProfile, 'id'>> }
  | { type: 'setEnergy'; level: Energy; date: string }
  | { type: 'setStatus'; status: Status }
  | { type: 'clearStatus' }
  | { type: 'createPlan'; plan: Plan }
  | { type: 'rsvp'; planId: string; personId: string; rsvp: Rsvp }
  | { type: 'respondRequest'; personId: string; accept: boolean }
  | { type: 'sendRequest'; person: Person; isNew: boolean }
  | { type: 'cancelRequest'; personId: string }
  | { type: 'removeFriend'; personId: string }
  | { type: 'block'; personId: string }
  | { type: 'unblock'; personId: string }
  | { type: 'setDemoClock'; iso: string | null }
  | { type: 'signOut' }
  | { type: 'resetDemo'; now: Date }

export function initialData(now: Date): AppData {
  return {
    version: 1,
    session: null,
    onboarding: 'schedule',
    profile: null,
    schedule: null,
    status: null,
    plans: samplePlans(now),
    friendships: SEED_FRIENDSHIPS,
    blocked: [],
    extraPeople: [],
    demoClock: null,
  }
}

export function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'signIn': {
      const name = action.name.trim()
      const initials = initialsOf(name)
      return {
        ...state,
        session: action.session,
        onboarding: state.schedule ? state.onboarding : 'schedule',
        profile: {
          id: 'me',
          name,
          initials: initials || 'ME',
          color: '#F6D27A',
          email: action.session.email,
          commuter: state.profile?.commuter ?? true,
          town: state.profile?.town ?? '',
          interests: state.profile?.interests ?? [],
          energy: state.profile?.energy,
        },
      }
    }
    case 'setOnboarding':
      return { ...state, onboarding: action.step }
    case 'setSchedule':
      return { ...state, schedule: action.schedule }
    case 'updateProfile':
      return state.profile ? { ...state, profile: { ...state.profile, ...action.patch } } : state
    case 'setEnergy':
      return state.profile
        ? { ...state, profile: { ...state.profile, energy: { level: action.level, date: action.date } } }
        : state
    case 'setStatus':
      return { ...state, status: action.status }
    case 'clearStatus':
      return { ...state, status: null }
    case 'createPlan':
      return { ...state, plans: [...state.plans, action.plan] }
    case 'rsvp':
      return {
        ...state,
        plans: state.plans.map((p) =>
          p.id !== action.planId
            ? p
            : {
                ...p,
                invitees: p.invitees.map((i) => (i.personId === action.personId ? { ...i, rsvp: action.rsvp } : i)),
              },
        ),
      }
    case 'respondRequest':
      return {
        ...state,
        friendships: action.accept
          ? state.friendships.map((f) => (f.personId === action.personId ? { ...f, state: 'accepted' } : f))
          : state.friendships.filter((f) => f.personId !== action.personId),
      }
    case 'sendRequest':
      if (state.friendships.some((f) => f.personId === action.person.id)) return state
      return {
        ...state,
        extraPeople: action.isNew ? [...state.extraPeople, action.person] : state.extraPeople,
        friendships: [...state.friendships, { personId: action.person.id, state: 'outgoing' }],
      }
    case 'cancelRequest':
    case 'removeFriend':
      return { ...state, friendships: state.friendships.filter((f) => f.personId !== action.personId) }
    case 'block':
      return {
        ...state,
        blocked: state.blocked.includes(action.personId) ? state.blocked : [...state.blocked, action.personId],
        friendships: state.friendships.filter((f) => f.personId !== action.personId),
      }
    case 'unblock':
      return { ...state, blocked: state.blocked.filter((id) => id !== action.personId) }
    case 'setDemoClock':
      return { ...state, demoClock: action.iso }
    case 'signOut':
      return { ...state, session: null }
    case 'resetDemo':
      return initialData(action.now)
  }
}
