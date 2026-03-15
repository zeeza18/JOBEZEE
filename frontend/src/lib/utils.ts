import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))

export const formatDate = (value: string | number | Date) => {
  const d = new Date(value)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export const randomId = () => crypto.randomUUID()

export const truncate = (value: string, max = 140) =>
  value.length > max ? `${value.slice(0, max)}…` : value
