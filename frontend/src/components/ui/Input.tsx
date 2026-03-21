import { cn } from '../../lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-400">{label}</label>
      )}
      <input
        className={cn(
          'w-full px-3 py-2.5 rounded-lg cyber-input',
          error && 'border-[#ff0064] focus:border-[#ff0064] focus:shadow-[0_0_15px_rgba(255,0,100,0.2)]',
          className
        )}
        {...props}
      />
      {error && <p className="text-sm text-[#ff0064]">{error}</p>}
    </div>
  )
}