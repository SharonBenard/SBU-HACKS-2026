import duckRight from '../assets/duck.png'
import duckLeft from '../assets/duck-left.png'

interface DuckProps {
  facing?: 'right' | 'left'
  className?: string
  width?: number
  /** Leave empty when the duck is decorative. */
  alt?: string
}

export function Duck({ facing = 'right', className, width, alt = '' }: DuckProps) {
  return (
    <img
      src={facing === 'right' ? duckRight : duckLeft}
      className={className}
      width={width}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      draggable={false}
    />
  )
}
