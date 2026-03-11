import { useState, useRef, useEffect } from 'react'
import type { RefObject } from 'react'
import type { MediaConnection } from 'peerjs'
import type { NetworkQuality } from '../types'

export type { NetworkQuality }

export function useNetworkQuality(
  callRef: RefObject<MediaConnection | null>,
  active: boolean
): NetworkQuality {
  const [quality, setQuality] = useState<NetworkQuality>(null)
  const prevStatsRef = useRef<Map<string, Record<string, unknown>>>(new Map())

  useEffect(() => {
    if (!active) {
      setQuality(null)
      prevStatsRef.current = new Map()
      return
    }

    const intervalId = setInterval(async () => {
      const pc = callRef.current?.peerConnection
      if (!pc) return

      const report = await pc.getStats()

      let rtt: number | null = null
      let nackCount: number | null = null
      let packetsSent: number | null = null
      let statId: string | null = null

      report.forEach((stat: Record<string, unknown>, id: string) => {
        if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
          if (typeof stat.currentRoundTripTime === 'number') {
            rtt = stat.currentRoundTripTime as number
          }
        }
        if (stat.type === 'outbound-rtp' && stat.kind === 'video') {
          nackCount = typeof stat.nackCount === 'number' ? (stat.nackCount as number) : null
          packetsSent = typeof stat.packetsSent === 'number' ? (stat.packetsSent as number) : null
          statId = id
        }
      })

      // Compute delta nack and delta packets from previous stats
      let loss: number | null = null
      if (statId !== null && nackCount !== null && packetsSent !== null) {
        const prev = prevStatsRef.current.get(statId)
        if (prev) {
          const prevNack = typeof prev.nackCount === 'number' ? (prev.nackCount as number) : 0
          const prevPackets = typeof prev.packetsSent === 'number' ? (prev.packetsSent as number) : 0
          const deltaNack = nackCount - prevNack
          const deltaPackets = packetsSent - prevPackets
          if (deltaPackets > 0) {
            loss = deltaNack / deltaPackets
          } else {
            loss = 0
          }
        }
      }

      // Store current stats
      report.forEach((stat: Record<string, unknown>, id: string) => {
        prevStatsRef.current.set(id, stat)
      })

      // Only classify if we have both loss and rtt from the delta
      if (loss !== null && rtt !== null) {
        if (loss < 0.02 && rtt < 0.15) {
          setQuality('good')
        } else if (loss < 0.08 && rtt < 0.4) {
          setQuality('fair')
        } else {
          setQuality('poor')
        }
      }
    }, 2000)

    return () => {
      clearInterval(intervalId)
      setQuality(null)
      prevStatsRef.current = new Map()
    }
  }, [active, callRef])

  return quality
}
