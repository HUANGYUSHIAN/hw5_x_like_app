'use client'

import { Box, Tabs, Tab } from '@mui/material'
import { useState } from 'react'

interface ProfileTabsProps {
  activeTab: 'posts' | 'likes'
  onTabChange: (tab: 'posts' | 'likes') => void
  showLikes?: boolean
}

export default function ProfileTabs({ activeTab, onTabChange, showLikes = true }: ProfileTabsProps) {
  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <Tabs value={activeTab} onChange={(_, value) => onTabChange(value)}>
        <Tab label="Posts" value="posts" />
        {showLikes && <Tab label="Likes" value="likes" />}
      </Tabs>
    </Box>
  )
}











