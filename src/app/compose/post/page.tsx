'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import PostComposer from '@/components/post/PostComposer'

export default function ComposePostPage() {
  const router = useRouter()
  const [composerOpen, setComposerOpen] = useState(true)

  const handleClose = () => {
    setComposerOpen(false)
    router.push('/')
  }

  const handlePost = () => {
    setComposerOpen(false)
    router.push('/')
  }

  return (
    <PostComposer
      open={composerOpen}
      onClose={handleClose}
      onPost={handlePost}
    />
  )
}




