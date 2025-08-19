import { useState, useCallback } from 'react'

interface RetryOptions {
  maxAttempts?: number
  delayMs?: number
  backoff?: boolean
}

export function useRetry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: RetryOptions = {}
) {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    backoff = true,
  } = options

  const [attempt, setAttempt] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const execute = useCallback(async (...args: Parameters<T>): Promise<ReturnType<T> | null> => {
    setIsLoading(true)
    setError(null)
    
    let currentAttempt = 0
    let currentDelay = delayMs
    
    while (currentAttempt < maxAttempts) {
      try {
        setAttempt(currentAttempt + 1)
        const result = await fn(...args)
        setIsLoading(false)
        return result
      } catch (err) {
        currentAttempt++
        
        if (currentAttempt >= maxAttempts) {
          setError(err instanceof Error ? err : new Error(String(err)))
          setIsLoading(false)
          return null
        }
        
        // 等待延迟时间
        await new Promise(resolve => setTimeout(resolve, currentDelay))
        
        // 如果启用退避，增加延迟时间
        if (backoff) {
          currentDelay *= 2
        }
      }
    }
    
    // 这行代码理论上不会执行，但为了类型安全而保留
    setIsLoading(false)
    return null
  }, [fn, maxAttempts, delayMs, backoff])

  const reset = useCallback(() => {
    setAttempt(0)
    setError(null)
    setIsLoading(false)
  }, [])

  return {
    execute,
    reset,
    isLoading,
    error,
    attempt,
    maxAttempts,
  }
}