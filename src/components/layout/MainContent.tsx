'use client'

import { Box } from '@mui/material'
import { ReactNode } from 'react'
import GlobalPostNotification from '@/components/notifications/GlobalPostNotification'

interface MainContentProps {
  children: ReactNode
}

export default function MainContent({ children }: MainContentProps) {
  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        minHeight: '100vh',
        height: '100vh', // 视口高度
        borderLeft: { xs: 'none', md: '1px solid rgba(0, 0, 0, 0.12)' },
        borderRight: { xs: 'none', md: '1px solid rgba(0, 0, 0, 0.12)' },
        maxWidth: { xs: '100%', sm: 600 },
        width: '100%',
        mx: 'auto',
        overflowY: 'auto', // 纵向滚动
        overflowX: 'hidden', // 防止横向滚动
        flexShrink: 0, // 防止被压缩
      }}
    >
      <GlobalPostNotification />
      {children}
    </Box>
  )
}











