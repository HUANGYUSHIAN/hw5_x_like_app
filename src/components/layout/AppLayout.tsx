'use client'

import { Box, useMediaQuery, useTheme } from '@mui/material'
import Sidebar from './Sidebar'
import MainContent from './MainContent'
import RightSidebar from './RightSidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        minHeight: '100vh',
        width: '100%',
        overflowX: 'auto', // 横向滚动 - 允许在移动设备上横向滚动查看右侧栏
        overflowY: 'hidden', // 防止整体页面纵向滚动
        position: 'relative',
        // 确保内容不会被压缩，允许横向滚动
        minWidth: { xs: '100vw', md: 'auto' },
      }}
    >
      <Sidebar />
      <MainContent>{children}</MainContent>
      {/* 在移动设备上不隐藏，允许通过横向滚动访问 */}
      <RightSidebar />
    </Box>
  )
}









