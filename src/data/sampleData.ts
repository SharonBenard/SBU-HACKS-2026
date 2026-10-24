/**
 * Typed sample data for the demo. Everything date-related is generated
 * relative to the current (or pinned demo) time, so the demo works any day.
 */
import type { BusyBlock, DayIndex, FriendRecord, Friendship, Plan, Status, WeeklySchedule } from '../types'
import { addDays, minutesOfDay, roundUp, toISODate, weekdayIndex } from '../lib/dates'

const h = (hours: number) => Math.round(hours * 60)

let blockSeq = 0
function block(day: DayIndex, start: number, end: number, kind: BusyBlock['kind'] = 'class', label?: string): BusyBlock {
  blockSeq += 1
  return { id: `seed_${blockSeq}`, day, start: h(start), end: h(end), kind, label }
}

function weekly(days: DayIndex[], start: number, end: number, kind: BusyBlock['kind'] = 'class', label?: string) {
  return days.map((d) => block(d, start, end, kind, label))
}

/** The schedule the simulated SOLAR parser "finds". */
export function sampleParsedSchedule(): WeeklySchedule {
  return {
    source: 'simulated-import',
    blocks: [
      ...weekly([0, 2], 10, 12, 'class', 'CSE 300'),
      ...weekly([0, 2, 4], 14, 15, 'class', 'AMS 310'),
      ...weekly([1, 3], 11, 13, 'class', 'CSE 316'),
      ...weekly([1, 3], 16, 18, 'class', 'PHY 131'),
      block(4, 17, 21, 'work', 'Work shift'),
    ],
  }
}

/** Accepted friends, pending requests and their free/busy schedules. */
export const FRIEND_DIRECTORY: FriendRecord[] = [
  {
    id: 'maya',
    name: 'Maya Patel',
    initials: 'MP',
    color: '#F4A792',
    email: 'maya.patel@stonybrook.edu',
    interests: ['Food', 'Cafés', 'Shopping'],
    schedule: [
      ...weekly([0, 2], 9, 11),
      ...weekly([1, 3], 13, 15),
      ...weekly([0, 2, 4], 15, 16.5),
      block(4, 10, 12),
      block(5, 10, 14, 'work'),
    ],
  },
  {
    id: 'jordan',
    name: 'Jordan Reyes',
    initials: 'JR',
    color: '#A9CDEB',
    email: 'jordan.reyes@stonybrook.edu',
    interests: ['Bowling', 'Movies', 'Games'],
    schedule: [
      ...weekly([0, 2, 4], 12, 14),
      ...weekly([1, 3], 9.5, 11),
      ...weekly([1, 3], 14, 16.5),
      block(6, 12, 17, 'work'),
    ],
  },
  {
    id: 'priya',
    name: 'Priya Shah',
    initials: 'PS',
    color: '#C5E3B2',
    email: 'priya.shah@stonybrook.edu',
    interests: ['Thrifting', 'Cafés', 'Movies'],
    schedule: [
      ...weekly([0, 2], 14, 17),
      ...weekly([1, 3], 10, 12),
      block(4, 9, 13),
      block(5, 9, 12, 'meeting'),
    ],
  },
  {
    id: 'leo',
    name: 'Leo Kim',
    initials: 'LK',
    color: '#D9C8F0',
    email: 'leo.kim@stonybrook.edu',
    interests: ['Movies', 'Pickleball', 'Games'],
    schedule: [
      ...weekly([0, 1, 2, 3, 4], 11, 13),
      ...weekly([1, 3], 15, 17),
      ...weekly([0, 2], 9, 10),
      block(6, 9, 13, 'work'),
    ],
  },
  {
    id: 'sam',
    name: 'Sam Okafor',
    initials: 'SO',
    color: '#F7D4B5',
    email: 'sam.okafor@stonybrook.edu',
    interests: ['Sports', 'Food'],
    schedule: [...weekly([0, 2, 4], 10, 12), ...weekly([0, 1, 2, 3, 4, 5, 6], 17, 22, 'work')],
  },
  {
    id: 'nina',
    name: 'Nina Alvarez',
    initials: 'NA',
    color: '#F2C9DD',
    email: 'nina.alvarez@stonybrook.edu',
    interests: ['Outdoors', 'Cafés'],
    schedule: [...weekly([1, 3], 9, 12), ...weekly([0, 2], 15, 17)],
  },
  {
    id: 'dev',
    name: 'Dev Mehta',
    initials: 'DM',
    color: '#BFE0DC',
    email: 'dev.mehta@stonybrook.edu',
    interests: ['Pickleball', 'Cooking'],
    schedule: [...weekly([0, 2, 4], 13, 15)],
  },
]

export const SEED_FRIENDSHIPS: Friendship[] = [
  { personId: 'maya', state: 'accepted' },
  { personId: 'jordan', state: 'accepted' },
  { personId: 'priya', state: 'accepted' },
  { personId: 'leo', state: 'accepted' },
  { personId: 'sam', state: 'accepted' },
  { personId: 'nina', state: 'incoming' },
  { personId: 'dev', state: 'outgoing' },
]

/**
 * Friends' current statuses, as the mock server would return them.
 * Two friends are free "right now", two set a status for an evening two days out.
 */
export function sampleFriendStatuses(now: Date): Status[] {
  const today = toISODate(now)
  const later = addDays(today, 2)
  const start = roundUp(minutesOfDay(now), 15) - 15
  const statuses: Status[] = [
    {
      id: 'st_priya',
      personId: 'priya',
      mode: 'later',
      date: later,
      start: h(18),
      end: h(21),
      activity: 'anything',
      budget: 'under30',
      energy: 'social',
      note: 'Want to hang',
    },
    {
      id: 'st_leo',
      personId: 'leo',
      mode: 'later',
      date: later,
      start: h(18),
      end: h(21),
      activity: 'staying-in',
      budget: 'under15',
      energy: 'chill',
      note: 'Movies?',
    },
  ]
  if (start < h(22)) {
    statuses.push(
      {
        id: 'st_maya',
        personId: 'maya',
        mode: 'now',
        date: today,
        start,
        end: Math.min(start + 150, h(24)),
        activity: 'food',
        budget: 'under15',
        energy: 'social',
      },
      {
        id: 'st_jordan',
        personId: 'jordan',
        mode: 'now',
        date: today,
        start,
        end: Math.min(start + 120, h(24)),
        activity: 'anything',
        budget: 'any',
        energy: 'social',
      },
    )
  }
  return statuses
}

function nextWeekday(today: string, target: DayIndex, minDaysAhead: number): string {
  for (let i = minDaysAhead; i < minDaysAhead + 7; i++) {
    const iso = addDays(today, i)
    if (weekdayIndex(iso) === target) return iso
  }
  return addDays(today, minDaysAhead)
}

/** Plans other friends already created that include me. */
export function samplePlans(now: Date): Plan[] {
  const today = toISODate(now)
  const created = now.toISOString()
  return [
    {
      id: 'plan_thrift',
      title: 'Thrift run',
      location: 'Savers, Centereach',
      date: nextWeekday(today, 5, 2),
      start: h(13),
      end: h(15),
      cost: '$10–30',
      transport: '15 min drive · Priya can drive 3',
      note: 'Looking for costume pieces.',
      leaderId: 'priya',
      invitees: [
        { personId: 'leo', rsvp: 'going' },
        { personId: 'me', rsvp: 'waiting' },
      ],
      activityId: 'thrift',
      inviteToken: 'demo-thrift',
      createdAt: created,
      reminders: ['day_before', 'two_hours_before'],
    },
    {
      id: 'plan_pickleball',
      title: 'Pickleball',
      location: 'Campus Recreation Center courts',
      date: addDays(today, 3),
      start: h(19),
      end: h(20.5),
      cost: '$5–15',
      transport: 'On campus · walk',
      note: 'Bring water. Leo has two spare paddles.',
      leaderId: 'leo',
      invitees: [
        { personId: 'me', rsvp: 'going' },
        { personId: 'jordan', rsvp: 'going' },
        { personId: 'maya', rsvp: 'not_going' },
      ],
      activityId: 'pickleball',
      inviteToken: 'demo-pickleball',
      createdAt: created,
      reminders: ['day_before'],
    },
  ]
}
