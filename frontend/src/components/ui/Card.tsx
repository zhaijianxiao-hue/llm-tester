import { ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface CardProps {
  title?: string
  children: ReactNode
  className?: string
  glow?: boolean
}

export function Card({ title, children, className, glow = false }: CardProps) {
  return (
    <div 
      className={cn(
        'glass-card p-4 transition-all duration-300',
        glow && 'hover:shadow-[0_0_30px_rgba(0,240,255,0.15)]',
        className
      )}
    >
      {title && (
        <div className="pb-3 mb-3 border-b border-[rgba(0,240,255,0.1)]">
          <h3 className="text-lg font-semibold text-white font-['Rajdhani']">{title}</h3>
        </div>
      )}
      <div>{children}</div>
    </div>
  )
}