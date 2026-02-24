import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"

export type Game = {
  id: string
  name: string
  provider?: string
  createdAt: string
  userId: string
  deviceId: string
}

export type RoundResult = {
  id: string
  gameId: string
  gameName: string
  provider?: string
  userId: string
  userName: string
  before: number
  after: number
  delta: number
  createdAt: string
}

export type User = {
  id: string
  name: string
  totalProfit: number
  rounds: RoundResult[]
}

export type ProviderStat = {
  provider: string
  totalProfit: number
  gamesPlayed: number
  biggestWin: number
  biggestLoss: number
}

export type ConnectedDevice = {
  deviceId: string
  userName: string
  hasSubmitted: boolean
}

type GameContextValue = {
  games: Game[]
  users: User[]
  providerStats: ProviderStat[]
  connectedDevices: ConnectedDevice[]
  currentUser: User | null
  isLoading: boolean
  isLocked: boolean
  deviceLimit: number
  hasSubmitted: boolean
  bonusTriggered: boolean
  bonusPrize: number | null
  registerUser: (name: string) => Promise<{ success: boolean; message?: string }>
  addGame: (value: string) => Promise<{ success: boolean; reason?: string }>
  adminCreateUser: (name: string) => Promise<{ success: boolean; message?: string; user?: User }>
  adminAddGameForUser: (payload: { userId: string; name: string }) => Promise<{
    success: boolean
    reason?: string
  }>
  removeGame: (id: string) => Promise<{ success: boolean; reason?: string }>
  lockWheel: () => Promise<boolean>
  unlockWheel: () => Promise<boolean>
  submitResult: (payload: {
    gameId: string
    before: number
    after: number
  }) => Promise<{ success: boolean; message?: string }>
  clearGames: () => Promise<boolean>
  checkBonus: () => Promise<boolean>
  spinBonus: () => Promise<number | null>
  clearBonus: () => void
}

const GameContext = createContext<GameContextValue | undefined>(undefined)

type GameProviderProps = {
  children: ReactNode
}

const deriveDefaultApiBase = () => {
  if (typeof window === "undefined") {
    return "http://localhost:5174"
  }

  const { protocol, hostname } = window.location
  return `${protocol}//${hostname}:5174`
}

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || deriveDefaultApiBase()

const buildUrl = (path: string) =>
  `${API_BASE_URL.replace(/\/+$|$/g, "")}${path.startsWith("/") ? path : `/${path}`}`

const ensureDeviceId = () => {
  if (typeof window === "undefined") {
    return null
  }

  const stored = window.localStorage.getItem("spin-wheel-device-id")?.trim()
  if (stored) {
    return stored
  }

  let generated = ""
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    generated = crypto.randomUUID()
  } else {
    generated = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  }

  window.localStorage.setItem("spin-wheel-device-id", generated)
  return generated
}

const loadStoredUser = () => {
  if (typeof window === "undefined") {
    return null
  }

  try {
    const raw = window.localStorage.getItem("spin-wheel-user")
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw) as User
    if (parsed && typeof parsed.id === "string" && typeof parsed.name === "string") {
      return parsed
    }
  } catch (error) {
    console.warn("Failed to parse stored user", error)
  }
  return null
}

const storeUser = (user: User | null) => {
  if (typeof window === "undefined") {
    return
  }
  if (!user) {
    window.localStorage.removeItem("spin-wheel-user")
    return
  }
  window.localStorage.setItem("spin-wheel-user", JSON.stringify(user))
}

const sanitize = (value: string) => value.trim()

const extractHasSubmitted = (
  games: Game[] | undefined,
  submittedDeviceIds: string[] | undefined,
  deviceId: string | null
) => {
  if (!deviceId) {
    return false
  }

  if (Array.isArray(submittedDeviceIds)) {
    return submittedDeviceIds.includes(deviceId)
  }

  return Array.isArray(games) ? games.some((game) => game.deviceId === deviceId) : false
}

export const GameProvider = ({ children }: GameProviderProps) => {
  const deviceIdRef = useRef<string | null>(ensureDeviceId())
  const [games, setGames] = useState<Game[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [providerStats, setProviderStats] = useState<ProviderStat[]>([])
  const [connectedDevices, setConnectedDevices] = useState<ConnectedDevice[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(loadStoredUser())
  const [isLoading, setIsLoading] = useState(true)
  const [isLocked, setIsLocked] = useState(false)
  const [deviceLimit, setDeviceLimit] = useState<number>(1)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [bonusTriggered, setBonusTriggered] = useState(false)
  const [bonusPrize, setBonusPrize] = useState<number | null>(null)
  const reconnectRef = useRef<number | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  const deviceId = deviceIdRef.current

  const fetchState = useCallback(async () => {
    try {
      const params = deviceId ? `?deviceId=${encodeURIComponent(deviceId)}` : ""
      const response = await fetch(buildUrl(`/games${params}`))
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      const data = (await response.json()) as {
        games?: Game[]
        isLocked?: boolean
        deviceLimit?: number
        hasSubmitted?: boolean
        users?: User[]
        providerStats?: ProviderStat[]
        connectedDevices?: ConnectedDevice[]
      }

      setGames(Array.isArray(data.games) ? data.games : [])
      setIsLocked(Boolean(data.isLocked))
      setDeviceLimit(typeof data.deviceLimit === "number" ? data.deviceLimit : 1)
      setHasSubmitted(Boolean(data.hasSubmitted))
      setUsers(Array.isArray(data.users) ? data.users : [])
      setProviderStats(Array.isArray(data.providerStats) ? data.providerStats : [])
      setConnectedDevices(Array.isArray(data.connectedDevices) ? data.connectedDevices : [])
    } catch (error) {
      console.error("Failed to load games", error)
    } finally {
      setIsLoading(false)
    }
  }, [deviceId])

  useEffect(() => {
    fetchState()

    return () => {
      if (reconnectRef.current && typeof window !== "undefined") {
        window.clearTimeout(reconnectRef.current)
      }
      eventSourceRef.current?.close()
    }
  }, [fetchState])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const openEventSource = () => {
      const params = deviceId ? `?deviceId=${encodeURIComponent(deviceId)}` : ""
      const source = new EventSource(buildUrl(`/events${params}`))
      eventSourceRef.current = source

      source.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as {
            games?: Game[]
            isLocked?: boolean
            users?: User[]
            providerStats?: ProviderStat[]
            connectedDevices?: ConnectedDevice[]
            deviceLimit?: number
            submittedDeviceIds?: string[]
            reset?: boolean
          }

          // Handle reset signal
          if (payload.reset === true) {
            // Clear all localStorage and state immediately
            if (typeof window !== "undefined") {
              window.localStorage.clear()
            }

            // Reset all state
            setCurrentUser(null)
            setGames([])
            setUsers([])
            setProviderStats([])
            setHasSubmitted(false)
            setIsLocked(false)

            // Force page reload to get fresh device ID and restart
            if (typeof window !== "undefined") {
              setTimeout(() => {
                window.location.reload()
              }, 100)
            }
            return
          }

          if (Array.isArray(payload.games)) {
            setGames(payload.games)
          }

          if (typeof payload.isLocked === "boolean") {
            setIsLocked(payload.isLocked)
          }

          if (Array.isArray(payload.users)) {
            setUsers(payload.users)
          }

          if (Array.isArray(payload.providerStats)) {
            setProviderStats(payload.providerStats)
          }

          if (Array.isArray(payload.connectedDevices)) {
            setConnectedDevices(payload.connectedDevices)
          }

          if (typeof payload.deviceLimit === "number") {
            setDeviceLimit(payload.deviceLimit)
          }

          setHasSubmitted(() =>
            extractHasSubmitted(payload.games, payload.submittedDeviceIds, deviceId)
          )

          if (!payload.games || payload.games.length === 0) {
            setHasSubmitted(false)
          }
        } catch (error) {
          console.error("Failed to parse events payload", error)
        }
      }

      source.onerror = () => {
        source.close()
        if (typeof window !== "undefined") {
          reconnectRef.current = window.setTimeout(() => {
            fetchState()
            openEventSource()
          }, 4000)
        }
      }
    }

    openEventSource()

    return () => {
      eventSourceRef.current?.close()
    }
  }, [deviceId, fetchState])

  const registerUser = useCallback(
    async (name: string) => {
      const sanitized = sanitize(name)
      if (!sanitized) {
        return { success: false, message: "Ange ett namn." }
      }

      try {
        const response = await fetch(buildUrl("/users"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: sanitized, deviceId }),
        })

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`)
        }

        const data = (await response.json()) as { user: User; users?: User[] }
        if (data.user) {
          setCurrentUser(data.user)
          storeUser(data.user)
        }
        if (Array.isArray(data.users)) {
          setUsers(data.users)
        }
        return { success: true }
      } catch (error) {
        console.error("Failed to register user", error)
        return { success: false, message: "Kunde inte spara namnet. Försök igen." }
      }
    },
    [deviceId]
  )

  const adminCreateUser = useCallback(
    async (name: string) => {
      const sanitized = sanitize(name)
      if (!sanitized) {
        return { success: false, message: "Ange ett namn." }
      }

      try {
        const response = await fetch(buildUrl("/admin/users"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: sanitized }),
        })

        if (response.status === 409) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null
          return {
            success: false,
            message: payload?.error || "Det finns redan en spelare med det namnet.",
          }
        }

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`)
        }

        const data = (await response.json()) as { user?: User; users?: User[] }

        if (Array.isArray(data.users)) {
          setUsers(data.users)
        }

        fetchState()

        return { success: true, user: data.user }
      } catch (error) {
        console.error("Failed to create user as admin", error)
        return { success: false, message: "Kunde inte skapa spelaren. Försök igen." }
      }
    },
    [fetchState]
  )

  const addGame = useCallback(
    async (value: string) => {
      const sanitized = sanitize(value)

      if (!sanitized) {
        return { success: false, reason: "empty" }
      }

      if (!currentUser) {
        return { success: false, reason: "no-user" }
      }

      const exists = games.some((game) => game.name.toLowerCase() === sanitized.toLowerCase())

      if (exists) {
        return { success: false, reason: "duplicate" }
      }

      try {
        const response = await fetch(buildUrl("/games"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: sanitized,
            deviceId,
            userId: currentUser.id,
          }),
        })

        if (response.status === 409) {
          const payload = (await response.json().catch(() => null)) as { code?: string } | null

          if (payload?.code === "user-submission-exists") {
            return { success: false, reason: "device-limit" }
          }

          return { success: false, reason: "duplicate" }
        }

        if (response.status === 429) {
          setHasSubmitted(true)
          return { success: false, reason: "device-limit" }
        }

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`)
        }

        setHasSubmitted(true)
        return { success: true }
      } catch (error) {
        console.error("Failed to add game", error)
        return { success: false, reason: "network" }
      }
    },
    [currentUser, deviceId, games]
  )

  const adminAddGameForUser = useCallback(
    async ({ userId, name }: { userId: string; name: string }) => {
      const sanitized = sanitize(name)

      if (!sanitized) {
        return { success: false, reason: "empty" }
      }

      if (!userId) {
        return { success: false, reason: "no-user" }
      }

      if (games.some((game) => game.name.toLowerCase() === sanitized.toLowerCase())) {
        return { success: false, reason: "duplicate" }
      }

      if (games.some((game) => game.userId === userId)) {
        return { success: false, reason: "user-limit" }
      }

      try {
        const response = await fetch(buildUrl("/admin/games"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId, name: sanitized }),
        })

        if (response.status === 404) {
          return { success: false, reason: "not-found" }
        }

        if (response.status === 409) {
          const payload = (await response.json().catch(() => null)) as { code?: string } | null

          if (payload?.code === "user-submission-exists") {
            return { success: false, reason: "user-limit" }
          }

          return { success: false, reason: "duplicate" }
        }

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`)
        }

        fetchState()

        return { success: true }
      } catch (error) {
        console.error("Failed to add game as admin", error)
        return { success: false, reason: "network" }
      }
    },
    [fetchState, games]
  )

  const removeGame = useCallback(async (id: string) => {
    if (!id) {
      return { success: false, reason: "missing-id" }
    }

    try {
      const response = await fetch(buildUrl(`/games/${id}`), {
        method: "DELETE",
      })

      if (response.status === 404) {
        return { success: false, reason: "not-found" }
      }

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      return { success: true }
    } catch (error) {
      console.error("Failed to remove game", error)
      return { success: false, reason: "network" }
    }
  }, [])

  const updateLockState = useCallback(async (locked: boolean) => {
    try {
      const response = await fetch(buildUrl("/spin"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ locked }),
      })

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      return true
    } catch (error) {
      console.error("Failed to update spin state", error)
      return false
    }
  }, [])

  const lockWheel = useCallback(() => updateLockState(true), [updateLockState])
  const unlockWheel = useCallback(() => updateLockState(false), [updateLockState])

  const submitResult = useCallback(
    async ({ gameId, before, after }: { gameId: string; before: number; after: number }) => {
      try {
        const response = await fetch(buildUrl("/results"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ gameId, before, after }),
        })

        if (!response.ok) {
          const message = await response.json().catch(() => null)
          return {
            success: false,
            message: message?.error || "Kunde inte spara resultatet.",
          }
        }

        setHasSubmitted(false)
        fetchState()

        return { success: true }
      } catch (error) {
        console.error("Failed to submit result", error)
        return { success: false, message: "Kunde inte spara resultatet." }
      }
    },
    [fetchState]
  )

  const clearGames = useCallback(async () => {
    try {
      const response = await fetch(buildUrl("/games/clear"), {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      setHasSubmitted(false)
      return true
    } catch (error) {
      console.error("Failed to clear games", error)
      return false
    }
  }, [])

  const checkBonus = useCallback(async () => {
    try {
      const response = await fetch(buildUrl("/bonus/check"))
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      const data = (await response.json()) as { shouldTrigger: boolean }
      if (data.shouldTrigger) {
        setBonusTriggered(true)
      }
      return data.shouldTrigger
    } catch (error) {
      console.error("Failed to check bonus", error)
      return false
    }
  }, [])

  const spinBonus = useCallback(async () => {
    try {
      const response = await fetch(buildUrl("/bonus/spin"), {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      const data = (await response.json()) as { amount: number }
      setBonusPrize(data.amount)
      return data.amount
    } catch (error) {
      console.error("Failed to spin bonus", error)
      return null
    }
  }, [])

  const clearBonus = useCallback(() => {
    setBonusTriggered(false)
    setBonusPrize(null)
  }, [])

  const value = useMemo<GameContextValue>(
    () => ({
      games,
      users,
      providerStats,
      connectedDevices,
      currentUser,
      isLoading,
      isLocked,
      deviceLimit,
      hasSubmitted,
      bonusTriggered,
      bonusPrize,
      registerUser,
      addGame,
      adminCreateUser,
      adminAddGameForUser,
      removeGame,
      lockWheel,
      unlockWheel,
      submitResult,
      clearGames,
      checkBonus,
      spinBonus,
      clearBonus,
    }),
    [
      games,
      users,
      providerStats,
      connectedDevices,
      currentUser,
      isLoading,
      isLocked,
      deviceLimit,
      hasSubmitted,
      bonusTriggered,
      bonusPrize,
      registerUser,
      addGame,
      adminCreateUser,
      adminAddGameForUser,
      removeGame,
      lockWheel,
      unlockWheel,
      submitResult,
      clearGames,
      checkBonus,
      spinBonus,
      clearBonus,
    ]
  )

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export const useGames = () => {
  const context = useContext(GameContext)

  if (!context) {
    throw new Error("useGames must be used within a GameProvider")
  }

  return context
}
