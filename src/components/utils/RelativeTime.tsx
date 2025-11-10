import { formatRelativeTime } from '@/lib/utils'
import { Typography } from '@mui/material'

interface RelativeTimeProps {
  date: Date | string
  variant?: 'body2' | 'caption'
}

export default function RelativeTime({ date, variant = 'caption' }: RelativeTimeProps) {
  return (
    <Typography variant={variant} color="text.secondary">
      {formatRelativeTime(date)}
    </Typography>
  )
}











