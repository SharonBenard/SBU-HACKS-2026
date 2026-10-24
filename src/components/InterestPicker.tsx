import { INTEREST_OPTIONS } from '../data/activities'

interface InterestPickerProps {
  value: string[]
  onChange: (value: string[]) => void
}

export function InterestPicker({ value, onChange }: InterestPickerProps) {
  const toggle = (i: string) => onChange(value.includes(i) ? value.filter((x) => x !== i) : [...value, i])
  return (
    <div className="chips" role="group" aria-label="Interests">
      {INTEREST_OPTIONS.map((i) => (
        <button key={i} type="button" className="chip" aria-pressed={value.includes(i)} onClick={() => toggle(i)}>
          {i}
        </button>
      ))}
    </div>
  )
}
