import { useNavigate } from 'react-router'
import { OnboardingFrame } from './OnboardingFrame'
import { ScheduleEditor } from '../../components/ScheduleEditor'
import { DemoTag, Notice } from '../../components/Notice'
import { useApp } from '../../state/context'

export function ReviewSchedule() {
  const { data, dispatch } = useApp()
  const navigate = useNavigate()
  const schedule = data.schedule ?? { blocks: [], source: 'manual' as const }
  const classCount = new Set(schedule.blocks.filter((b) => b.kind === 'class').map((b) => b.label)).size
  const simulated = schedule.source === 'simulated-import'

  return (
    <OnboardingFrame title={simulated ? 'Does this look right?' : 'When are you busy?'} step={3} back="/onboarding/schedule">
      <Notice tone="green" icon="none">
        {simulated ? (
          <>
            Found {classCount} classes in your SOLAR screenshot. Tap any hour to fix it, then add work, meetings or
            commute time.
          </>
        ) : (
          <>Tap each hour you have class. Tap again for other commitments. Then add work, meetings or commute time.</>
        )}
      </Notice>
      {simulated && (
        <Notice tone="demo">
          <DemoTag /> These classes are sample data from the simulated parser, not read from your image.
        </Notice>
      )}
      <ScheduleEditor
        blocks={schedule.blocks}
        onChange={(blocks) => dispatch({ type: 'setSchedule', schedule: { ...schedule, blocks } })}
      />
      <button
        type="button"
        className="btn btn-primary btn-block"
        onClick={() => {
          dispatch({ type: 'setOnboarding', step: 'interests' })
          navigate('/onboarding/interests')
        }}
      >
        Looks good
      </button>
    </OnboardingFrame>
  )
}
