'use client'

import { useEffect, useRef } from 'react'
import { getPusherClient } from '@/lib/pusher'

export function usePusher(channelName: string | null, eventName: string, callback: (data: any) => void) {
  const callbackRef = useRef(callback)

  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    if (!channelName) return
    
    const pusher = getPusherClient()
    if (!pusher) return

    try {
      const channel = pusher.subscribe(channelName)
      const wrappedCallback = (data: any) => {
        callbackRef.current(data)
      }
      
      channel.bind(eventName, wrappedCallback)

      return () => {
        try {
          channel.unbind(eventName, wrappedCallback)
          pusher.unsubscribe(channelName)
        } catch (error) {
          console.warn('Error unsubscribing from Pusher:', error)
        }
      }
    } catch (error) {
      console.warn('Error subscribing to Pusher channel:', error)
    }
  }, [channelName, eventName])
}

