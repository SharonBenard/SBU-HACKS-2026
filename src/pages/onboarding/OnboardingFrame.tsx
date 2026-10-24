import type { ReactNode } from 'react'
import { PageHead } from '../../components/PageHead'

interface OnboardingFrameProps {
  title: string
  step: number
  total?: number
  back?: string
  children: ReactNode
}

export function OnboardingFrame({ title, step, total = 4, back = '/welcome', children }: OnboardingFrameProps) {
  return (
    <div className="onb">
      <main className="onb-inner" id="main">
        <PageHead
          title=""
          fallback={back}
          right={
            <div className="progress-dots" role="img" aria-label={`Step ${step} of ${total}`}>
              {Array.from({ length: total }, (_, i) => (
                <i key={i} className={i + 1 === step ? 'on' : ''} />
              ))}
            </div>
          }
        />
        <h1 className="page-title">{title}</h1>
        {children}
      </main>
    </div>
  )
}
