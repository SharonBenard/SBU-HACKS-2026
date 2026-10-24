import { useApp, useToast } from '../state/context'
import { PageHead } from '../components/PageHead'
import { ScheduleEditor } from '../components/ScheduleEditor'
import { Notice } from '../components/Notice'

export function EditSchedule() {
  const { data, dispatch } = useApp()
  const toast = useToast()
  const schedule = data.schedule ?? { blocks: [], source: 'manual' as const }

  return (
    <div className="page">
      <PageHead title="Weekly schedule" fallback="/me" />
      <Notice tone="green" icon="none">
        Tap an hour to cycle free → class → other commitment. Changes save automatically and update your free time
        everywhere.
      </Notice>
      <ScheduleEditor
        blocks={schedule.blocks}
        onChange={(blocks) => dispatch({ type: 'setSchedule', schedule: { ...schedule, blocks } })}
      />
      <Notice tone="info" icon="lock">
        Friends only see free or busy. Class names stay private to you.
      </Notice>
      {schedule.blocks.length > 0 && (
        <button
          type="button"
          className="btn btn-danger btn-block"
          onClick={() => {
            dispatch({ type: 'setSchedule', schedule: { blocks: [], source: 'manual' } })
            toast.show('Schedule cleared.')
          }}
        >
          Clear whole schedule
        </button>
      )}
    </div>
  )
}
