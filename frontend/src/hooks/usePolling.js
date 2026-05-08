import { useEffect, useRef } from 'react'

export function usePolling(fn, interval = 5000, active = true) {
  const fnRef = useRef(fn)
  fnRef.current = fn

  useEffect(() => {
    if (!active) return
    const id = setInterval(() => fnRef.current(), interval)
    return () => clearInterval(id)
  }, [interval, active])
}
