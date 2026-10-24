import { useApp, useToast } from '../state/context'
import { getPerson } from '../state/selectors'
import { PageHead } from '../components/PageHead'
import { Avatar } from '../components/Avatar'
import { EmptyState } from '../components/EmptyState'
import { DemoTag, Notice } from '../components/Notice'

export function Blocked() {
  const world = useApp()
  const { data, dispatch } = world
  const toast = useToast()

  return (
    <div className="page">
      <PageHead title="Blocked & reported" fallback="/me" />
      <p className="muted small">
        Blocked people can't see your free time, statuses or plans, and you won't see theirs. You can block someone from
        the Friends list.
      </p>
      {data.blocked.length === 0 ? (
        <EmptyState title="Nobody blocked" duck={false}>
          You haven't blocked anyone.
        </EmptyState>
      ) : (
        <div className="card" style={{ paddingTop: 4, paddingBottom: 4 }}>
          {data.blocked.map((id) => {
            const p = getPerson(world, id)
            return (
              <div key={id} className="person-row">
                <Avatar person={p} />
                <div className="grow">
                  <div className="name">{p?.name ?? id}</div>
                  <div className="sub">Blocked</div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    dispatch({ type: 'unblock', personId: id })
                    toast.show(`${p?.name ?? 'They'} unblocked. Send a new friend request to reconnect.`)
                  }}
                >
                  Unblock<span className="visually-hidden"> {p?.name}</span>
                </button>
              </div>
            )
          })}
        </div>
      )}
      <Notice tone="demo">
        <DemoTag /> Reporting needs a moderation backend that isn't connected yet. If someone makes you feel unsafe,
        block them and contact SBU's Dean of Students.
      </Notice>
    </div>
  )
}
