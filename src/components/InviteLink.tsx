import type { Plan } from '../types'
import { useToast } from '../state/context'
import { copyText } from '../lib/clipboard'
import { inviteUrl } from '../lib/plans'

export function InviteLink({ plan }: { plan: Plan }) {
  const toast = useToast()
  const url = inviteUrl(plan)
  return (
    <div className="stack-sm">
      <div className="copy-box">
        <div className="grow">
          <span className="small muted">Invite link for the group chat</span>
          <code>{url.replace(/^https?:\/\//, '')}</code>
        </div>
        <button
          type="button"
          className="btn btn-sm"
          style={{ background: 'var(--navy)', color: '#fff' }}
          onClick={async () => {
            const ok = await copyText(url)
            toast.show(ok ? 'Invite link copied.' : "Couldn't copy. Press and hold the link to copy it.")
          }}
        >
          Copy<span className="visually-hidden"> invite link</span>
        </button>
      </div>
      <p className="small muted">
        Demo: plans are saved in this browser only, so the link opens the plan here but not on a friend's phone yet.
      </p>
    </div>
  )
}
