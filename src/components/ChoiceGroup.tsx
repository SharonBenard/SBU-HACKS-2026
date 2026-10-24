import { useRef, type KeyboardEvent, type ReactNode } from 'react'

interface Option<T extends string> {
  value: T
  label: ReactNode
  /** Accessible name when `label` isn't plain text. */
  ariaLabel?: string
  disabled?: boolean
}

interface ChoiceGroupProps<T extends string> {
  label: string
  /** Hide the visible legend (it's still announced). */
  hideLabel?: boolean
  hint?: ReactNode
  options: Option<T>[]
  value: T | null
  onChange: (value: T) => void
  variant?: 'chip' | 'tile'
  className?: string
}

/**
 * Single-select radio group rendered as chips or tiles.
 * Arrow keys move between options, as with native radio buttons.
 */
export function ChoiceGroup<T extends string>({
  label,
  hideLabel,
  hint,
  options,
  value,
  onChange,
  variant = 'chip',
  className,
}: ChoiceGroupProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const enabled = options.filter((o) => !o.disabled)
  const focusIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value && !o.disabled),
  )

  const onKeyDown = (e: KeyboardEvent, index: number) => {
    const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp']
    if (!keys.includes(e.key)) return
    e.preventDefault()
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1
    const pos = enabled.findIndex((o) => o.value === options[index].value)
    const next = enabled[(pos + dir + enabled.length) % enabled.length]
    const nextIndex = options.findIndex((o) => o.value === next.value)
    onChange(next.value)
    refs.current[nextIndex]?.focus()
  }

  const id = `cg-${label.replace(/\W+/g, '-').toLowerCase()}`
  return (
    <div className="stack-sm">
      <div className="section-title" id={id} hidden={hideLabel}>
        <span>{label}</span>
        {hint && <small>{hint}</small>}
      </div>
      <div
        role="radiogroup"
        aria-labelledby={id}
        aria-label={hideLabel ? label : undefined}
        className={className ?? (variant === 'chip' ? 'chips' : 'tiles')}
      >
        {options.map((o, i) => (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={o.value === value}
            aria-label={o.ariaLabel}
            disabled={o.disabled}
            tabIndex={i === focusIndex ? 0 : -1}
            className={variant}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}
