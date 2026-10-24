/**
 * Mock "server" for friend data. A real backend would return only accepted
 * friends' free/busy blocks (never class names) and their active statuses.
 */
import type { FriendRecord, Status } from '../types'
import { FRIEND_DIRECTORY, sampleFriendStatuses } from '../data/sampleData'

export function getFriendDirectory(): FriendRecord[] {
  return FRIEND_DIRECTORY
}

export function getFriendStatuses(sessionStart: Date): Status[] {
  return sampleFriendStatuses(sessionStart)
}

export function findDirectoryPersonByEmail(email: string): FriendRecord | undefined {
  const e = email.trim().toLowerCase()
  return FRIEND_DIRECTORY.find((p) => p.email === e)
}
