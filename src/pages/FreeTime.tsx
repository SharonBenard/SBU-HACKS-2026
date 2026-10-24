import { useRef, useState, type KeyboardEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useApp } from '../state/context'
import { acceptedFriends, friendAvailability, myAvailability } from '../state/selectors'
import { Avatar } from '../components/Avatar'
import { FriendsPanel } from '../components/FriendsPanel'
import { freeAtHour, isFree } from '../lib/availability'
import { DAY_SHORT, addDays, formatDayShort, formatTime, formatTimeFull, hourLabel, parseISODate, weekdayIndex } from '../lib/dates'
import { GRID_HOURS } from '../lib/schedule'

export function FreeTime() {
  const world = useApp()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'friends' ? 'friends' : 'grid'
  const incoming = world.data.friendships.filter((f) => f.state === 'incoming').length

  const setTab = (t: 'grid' | 'friends') => setParams(t === 'friends' ? { tab: 'friends' } : {}, { replace: true })

  return (
    <div className="page page--wide">
      <h1 className="page-title">Free time</h1>
      <div className="segmented" role="tablist" aria-label="Free time views">
        <button
          type="button"
          role="tab"
          id="tab-grid"
          aria-controls="panel-grid"
          aria-selected={tab === 'grid'}
          onClick={() => setTab('grid')}
        >
          Week grid
        </button>
        <button
          type="button"
          role="tab"
          id="tab-friends"
          aria-controls="panel-friends"
          aria-selected={tab === 'friends'}
          onClick={() => setTab('friends')}
        >
          Friends{incoming > 0 ? ` · ${incoming} new` : ''}
        </button>
      </div>
      {tab === 'grid' ? (
        <div role="tabpanel" id="panel-grid" aria-labelledby="tab-grid" className="stack">
          <WeekGrid />
        </div>
      ) : (
        <div role="tabpanel" id="panel-friends" aria-labelledby="tab-friends" className="stack">
          <FriendsPanel />
        </div>
      )}
    </div>
  )
}

function WeekGrid() {
  const world = useApp()
  const { today, nowMinutes } = world
  const friends = acceptedFriends(world)
  const [selected, setSelected] = useState<Set<string>>(() => new Set(friends.map((f) => f.id)))
  const [cell, setCell] = useState<{ d: number; h: number } | null>(null)
  const [focus, setFocus] = useState<{ d: number; h: number }>({ d: 0, h: 0 })
  const refs = useRef<Map<string, HTMLButtonElement>>(new Map())

  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i))
  const me = { ...myAvailability(world), status: null }
  const chosen = friends.filter((f) => selected.has(f.id))
  const inputs = chosen.map((f) => friendAvailability(world, f))

  const toggle = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const isPast = (d: number, hour: number) => d === 0 && (hour + 1) * 60 <= nowMinutes

  const onKey = (e: KeyboardEvent, d: number, hi: number) => {
    const moves: Record<string, [number, number]> = {
      ArrowRight: [1, 0],
      ArrowLeft: [-1, 0],
      ArrowDown: [0, 1],
      ArrowUp: [0, -1],
    }
    const m = moves[e.key]
    if (!m) return
    e.preventDefault()
    const nd = Math.min(6, Math.max(0, d + m[0]))
    const nh = Math.min(GRID_HOURS.length - 1, Math.max(0, hi + m[1]))
    setFocus({ d: nd, h: nh })
    refs.current.get(`${nd}-${nh}`)?.focus()
  }

  const detail = (() => {
    if (!cell) return null
    const iso = days[cell.d]
    const hour = GRID_HOURS[cell.h]
    const ids = freeAtHour(inputs, iso, hour)
    // Extend the slot while the same friends stay free (up to 3 hours) and I'm free.
    let end = (hour + 1) * 60
    while (
      end < (hour + 3) * 60 &&
      end < 24 * 60 &&
      ids.every((id) => isFree(inputs.find((x) => x.id === id)!, iso, end, end + 60)) &&
      isFree(me, iso, end, end + 60)
    ) {
      end += 60
    }
    const names = ids.map((id) => friends.find((f) => f.id === id)!.name.split(' ')[0])
    return { iso, hour, ids, names, end, busy: !isFree(me, iso, hour * 60, (hour + 1) * 60) }
  })()

  return (
    <>
      <p className="small muted">
        {formatDayShort(days[0])} – {formatDayShort(days[6])}. Numbers show how many selected friends are free. Tap a
        slot to plan it.
      </p>
      {friends.length === 0 ? (
        <p className="small">
          Add friends to compare free time. <Link to="/free-time?tab=friends">Go to Friends</Link>
        </p>
      ) : (
        <div className="friend-filter" role="group" aria-label="Friends to include">
          {friends.map((f) => (
            <button key={f.id} type="button" className="friend-pill" aria-pressed={selected.has(f.id)} onClick={() => toggle(f.id)}>
              <Avatar person={f} size={30} />
              {f.name.split(' ')[0]}
            </button>
          ))}
        </div>
      )}

      <div className="card" style={{ padding: 10 }}>
        <div className="week-grid" role="grid" aria-label="Friends free each hour this week" aria-rowcount={GRID_HOURS.length + 1}>
          <div role="row" style={{ display: 'contents' }}>
            <span role="columnheader" aria-hidden />
            {days.map((iso, d) => (
              <span role="columnheader" key={iso} className={`col-head${d === 0 ? ' today' : ''}`}>
                {DAY_SHORT[weekdayIndex(iso)]}
                <strong>{parseISODate(iso).getDate()}</strong>
              </span>
            ))}
          </div>
          {GRID_HOURS.map((hour, hi) => (
            <div role="row" key={hour} style={{ display: 'contents' }}>
              <span role="rowheader" className="row-head">
                {hourLabel(hour)}
              </span>
              {days.map((iso, d) => {
                const past = isPast(d, hour)
                const count = freeAtHour(inputs, iso, hour).length
                const busy = !isFree(me, iso, hour * 60, (hour + 1) * 60)
                const level = count === 0 ? '' : count === 1 ? 'n1' : count === 2 ? 'n2' : 'n3'
                const isSel = cell?.d === d && cell?.h === hi
                const label = `${formatDayShort(iso)}, ${formatTime(hour * 60)}: ${count} friend${count === 1 ? '' : 's'} free${busy ? ", you're busy" : ''}${past ? ', past' : ''}`
                return (
                  <span role="gridcell" key={iso} style={{ display: 'contents' }}>
                    <button
                      ref={(el) => {
                        if (el) refs.current.set(`${d}-${hi}`, el)
                        else refs.current.delete(`${d}-${hi}`)
                      }}
                      type="button"
                      className={`wk-cell ${level}${busy ? ' busy' : ''}${past ? ' past' : ''}`}
                      aria-label={label}
                      aria-pressed={isSel}
                      aria-disabled={past}
                      tabIndex={focus.d === d && focus.h === hi ? 0 : -1}
                      onKeyDown={(e) => onKey(e, d, hi)}
                      onFocus={() => setFocus({ d, h: hi })}
                      onClick={() => !past && setCell(isSel ? null : { d, h: hi })}
                    >
                      {count > 0 ? count : ''}
                    </button>
                  </span>
                )
              })}
            </div>
          ))}
        </div>
        <div className="legend" style={{ marginTop: 10 }}>
          <span>
            <i style={{ background: 'var(--blue-1)' }} /> 1
          </span>
          <span>
            <i style={{ background: 'var(--blue-2)' }} /> 2
          </span>
          <span>
            <i style={{ background: 'var(--blue-3)' }} /> 3+ free
          </span>
          <span>
            <i
              style={{
                background: 'var(--cell)',
                backgroundImage: 'repeating-linear-gradient(135deg, rgb(160 130 80 / .5) 0 2px, transparent 2px 5px)',
              }}
            />{' '}
            You're busy
          </span>
        </div>
      </div>

      <div aria-live="polite">
        {detail && (
          <section className="card slot-panel stack-sm" aria-label="Selected time">
            <strong>
              {formatDayShort(detail.iso)} · {formatTimeFull(detail.hour * 60)}
            </strong>
            <p className="small">
              {detail.names.length === 0
                ? 'None of the selected friends are free then.'
                : `${detail.names.join(', ')} ${detail.names.length === 1 ? 'is' : 'are'} free.`}
              {detail.busy && " You're busy then, per your schedule or plans."}
            </p>
            {detail.names.length > 0 && (
              <Link
                to={`/plans/new?date=${detail.iso}&start=${detail.hour * 60}&end=${detail.end}&friends=${detail.ids.join(',')}`}
                className="btn btn-primary btn-block"
              >
                Plan for this time
              </Link>
            )}
          </section>
        )}
      </div>
    </>
  )
}
