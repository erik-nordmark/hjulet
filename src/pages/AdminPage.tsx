import { useEffect, useMemo, useRef, useState } from "react"
import type { ChangeEvent, FormEvent, TransitionEvent, MouseEvent } from "react"
import { createPortal } from "react-dom"
import Wheel from "../components/Wheel"
import WinnerScreen from "../components/WinnerScreen"
import { BonusWheel } from "../components/BonusWheel"
import { useGames } from "../context/GameContext"
import { playSpinSound, playTickSound, playApplauseSound } from "../lib/sound"
import {
  SLOT_GAMES,
  SLOT_GAMES_BY_PROVIDER,
  SLOT_PROVIDERS,
  type SlotProviderId,
  type SlotGame,
} from "../data/slots"
import { UNDECIDED_SLOTS } from "../data/undecidedSlots"

type WinnerGame = {
  id: string
  name: string
  userId: string
}

const AdminPage = () => {
  const {
    games,
    users,
    providerStats,
    connectedDevices,
    currentUser,
    isLoading,
    isLocked,
    addGame,
    removeGame,
    lockWheel,
    unlockWheel,
    submitResult,
    clearGames,
    checkBonus,
    spinBonus,
    clearBonus,
    bonusTriggered,
    adminCreateUser,
    adminAddGameForUser,
  } = useGames()

  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [rotation, setRotation] = useState(0)
  const [isSpinning, setIsSpinning] = useState(false)
  const [showFullscreen, setShowFullscreen] = useState(false)
  const [showWinnerScreen, setShowWinnerScreen] = useState(false)
  const [buttonPulse, setButtonPulse] = useState(false)
  const [pendingWinnerId, setPendingWinnerId] = useState<string | null>(null)
  const [winnerGame, setWinnerGame] = useState<WinnerGame | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [expandedProviders, setExpandedProviders] = useState<
    Partial<Record<SlotProviderId, boolean>>
  >({})
  const [newUserName, setNewUserName] = useState("")
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [isScrapingGames, setIsScrapingGames] = useState(false)
  const [scrapeResults, setScrapeResults] = useState<string | null>(null)
  const buttonPulseTimeoutRef = useRef<number | null>(null)
  const tickIntervalRef = useRef<number | null>(null)
  const spinFallbackRef = useRef<number | null>(null)

  useEffect(() => {
    if (users.length === 0) {
      setSelectedUserId((prev) => {
        if (prev && currentUser && prev === currentUser.id) {
          return prev
        }
        return currentUser?.id ?? ""
      })
      return
    }

    setSelectedUserId((prev) => {
      if (prev && users.some((user) => user.id === prev)) {
        return prev
      }
      return users[0].id
    })
  }, [users, currentUser])

  useEffect(() => {
    if (!winnerGame?.id) {
      return
    }

    const current = games.find((game) => game.id === winnerGame.id)
    if (!current) {
      setWinnerGame(null)
    }
  }, [games, winnerGame?.id])

  useEffect(() => {
    if (typeof document === "undefined") {
      return
    }

    if (showFullscreen || showWinnerScreen) {
      const previousOverflow = document.body.style.overflow
      document.body.style.overflow = "hidden"
      return () => {
        document.body.style.overflow = previousOverflow
      }
    }

    document.body.style.overflow = ""
  }, [showFullscreen, showWinnerScreen])

  useEffect(() => {
    if (!isSpinning) {
      if (tickIntervalRef.current && typeof window !== "undefined") {
        window.clearInterval(tickIntervalRef.current)
        tickIntervalRef.current = null
      }
      return
    }

    playTickSound()

    if (typeof window !== "undefined") {
      tickIntervalRef.current = window.setInterval(() => {
        playTickSound()
      }, 180)
    }

    return () => {
      if (tickIntervalRef.current && typeof window !== "undefined") {
        window.clearInterval(tickIntervalRef.current)
        tickIntervalRef.current = null
      }
    }
  }, [isSpinning])

  useEffect(
    () => () => {
      if (buttonPulseTimeoutRef.current && typeof window !== "undefined") {
        window.clearTimeout(buttonPulseTimeoutRef.current)
      }
      if (tickIntervalRef.current && typeof window !== "undefined") {
        window.clearInterval(tickIntervalRef.current)
      }
      if (spinFallbackRef.current && typeof window !== "undefined") {
        window.clearTimeout(spinFallbackRef.current)
      }
    },
    [],
  )

  const helperText = useMemo(() => {
    if (isLoading) {
      return "Laddar spel…"
    }
    if (isLocked || isSpinning) {
      return "Hjulet snurrar just nu."
    }
    if (games.length === 0) {
      return "Lägg till minst två spel för att kunna snurra."
    }
    if (games.length === 1) {
      return "Lägg till ett spel till för att låsa upp knappen."
    }
    return `Klart att snurra med ${games.length} spel.`
  }, [games.length, isLoading, isLocked, isSpinning])

  const filteredSlots = useMemo<SlotGame[]>(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) {
      return SLOT_GAMES.slice(0, 25)
    }

    return SLOT_GAMES.filter(
      (slot) =>
        slot.name.toLowerCase().includes(query) || slot.provider.toLowerCase().includes(query),
    ).slice(0, 60)
  }, [searchTerm])

  const canSpin = !isLoading && !isLocked && !isSpinning && games.length >= 2

  const handleSpin = async () => {
    if (!canSpin) {
      if (isLocked) {
        setError("Hjulet är redan låst. Vänta tills snurret är klart.")
      }
      return
    }

    const locked = await lockWheel()
    if (!locked) {
      setError("Kunde inte låsa hjulet. Försök igen om en stund.")
      return
    }

    const randomIndex = Math.floor(Math.random() * games.length)
    const selectedGame = games[randomIndex]
    const sliceAngle = 360 / games.length
    const targetAngle = 360 - (randomIndex * sliceAngle + sliceAngle / 2)
    const normalizedTarget = ((targetAngle % 360) + 360) % 360
    const currentRotation = ((rotation % 360) + 360) % 360
    let extraRotation = normalizedTarget - currentRotation

    if (extraRotation <= 0) {
      extraRotation += 360
    }

    const extraSpins = Math.floor(Math.random() * 3) + 4
    const nextRotation = rotation + extraRotation + extraSpins * 360

    setPendingWinnerId(selectedGame.id)
    setWinnerGame({ id: selectedGame.id, name: selectedGame.name, userId: selectedGame.userId })
    setShowFullscreen(true)
    setIsSpinning(true)

    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          setRotation(nextRotation)
          playSpinSound()
        })
      })
    } else {
      setRotation(nextRotation)
      playSpinSound()
    }

    if (buttonPulseTimeoutRef.current && typeof window !== "undefined") {
      window.clearTimeout(buttonPulseTimeoutRef.current)
    }
    setButtonPulse(true)
    if (typeof window !== "undefined") {
      buttonPulseTimeoutRef.current = window.setTimeout(() => {
        setButtonPulse(false)
      }, 650)
    }

    if (spinFallbackRef.current && typeof window !== "undefined") {
      window.clearTimeout(spinFallbackRef.current)
    }
    if (typeof window !== "undefined") {
      spinFallbackRef.current = window.setTimeout(() => {
        handleSpinEnd({ propertyName: "transform" } as TransitionEvent<HTMLDivElement>)
      }, 5200)
    }
  }

  const handleSpinEnd = async (event: TransitionEvent<HTMLDivElement>) => {
    if (event.propertyName !== "transform" || !isSpinning) {
      return
    }

    if (spinFallbackRef.current && typeof window !== "undefined") {
      window.clearTimeout(spinFallbackRef.current)
      spinFallbackRef.current = null
    }

    setIsSpinning(false)

    if (pendingWinnerId) {
      const winner = games.find((game) => game.id === pendingWinnerId)
      if (winner) {
        setWinnerGame({ id: winner.id, name: winner.name, userId: winner.userId })
        setShowWinnerScreen(true)
        playApplauseSound()
      }
    }

    setPendingWinnerId(null)

    const unlocked = await unlockWheel()
    if (!unlocked) {
      setError("Kunde inte låsa upp hjulet. Kontrollera servern.")
      return
    }

    // Check if bonus should trigger
    await checkBonus()
  }

  const handleWinnerScreenClose = () => {
    setShowFullscreen(false)
    setShowWinnerScreen(false)
    setWinnerGame(null)
    clearGames().catch((error) => {
      console.error("Failed to clear games after closing winner screen", error)
    })
  }

  const handleEmergencyReset = async () => {
    // Clear all timeouts and intervals
    if (buttonPulseTimeoutRef.current && typeof window !== "undefined") {
      window.clearTimeout(buttonPulseTimeoutRef.current)
    }
    if (tickIntervalRef.current && typeof window !== "undefined") {
      window.clearInterval(tickIntervalRef.current)
    }
    if (spinFallbackRef.current && typeof window !== "undefined") {
      window.clearTimeout(spinFallbackRef.current)
    }

    // Reset all spinning-related states
    setIsSpinning(false)
    setShowFullscreen(false)
    setShowWinnerScreen(false)
    setButtonPulse(false)
    setPendingWinnerId(null)
    setWinnerGame(null)

    // Unlock the wheel on the server
    try {
      await unlockWheel()
      await clearGames()
    } catch (error) {
      console.error("Failed to unlock wheel during emergency reset:", error)
    }

    console.log("Emergency reset completed")
  }

  const handleWinnerResultSubmit = async (before: number, after: number) => {
    if (!winnerGame) {
      return { success: false, message: "Ingen vinnare att spara." }
    }

    const result = await submitResult({ gameId: winnerGame.id, before, after })

    if (!result.success) {
      return result
    }

    setShowFullscreen(false)
    setShowWinnerScreen(false)
    setWinnerGame(null)
    return { success: true }
  }

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value)
  }

  const toggleProvider = (providerId: SlotProviderId) => {
    setExpandedProviders((prev) => ({
      ...prev,
      [providerId]: !prev[providerId],
    }))
  }

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = newUserName.trim()
    if (!trimmed) {
      setError("Ange ett namn för spelaren.")
      return
    }

    const result = await adminCreateUser(trimmed)

    if (!result.success) {
      setError(result.message ?? "Kunde inte skapa spelaren. Försök igen.")
      return
    }

    if (result.user) {
      setSelectedUserId(result.user.id)
    }

    setError(null)
    setSuccessMessage(`Spelaren "${result.user?.name ?? trimmed}" är nu skapad.`)
    setNewUserName("")
  }

  const handleQuickAdd = async (event: MouseEvent<HTMLButtonElement>, slotName: string) => {
    event.preventDefault()

    if (isSpinning || (isLocked && !selectedUserId)) {
      setError("Hjulet snurrar just nu. Vänta tills rundan är klar.")
      setSuccessMessage(null)
      return
    }

    const targetUserId = selectedUserId || currentUser?.id || ""
    const targetUserName = selectedUserId
      ? (users.find((user) => user.id === selectedUserId)?.name ?? "spelaren")
      : (currentUser?.name ?? "spelaren")

    if (!targetUserId) {
      setError("Välj vilken spelare du vill lägga till spelet för.")
      setSuccessMessage(null)
      return
    }

    let result: { success: boolean; reason?: string }

    if (selectedUserId) {
      result = await adminAddGameForUser({ userId: selectedUserId, name: slotName })
    } else {
      result = await addGame(slotName)
    }

    if (!result.success) {
      setSuccessMessage(null)
      if (result.reason === "duplicate") {
        setError("Det spelet finns redan på hjulet.")
      } else if (result.reason === "network") {
        setError("Det gick inte att spara spelet. Försök igen om en stund.")
      } else if (result.reason === "no-user") {
        setError("Registrera en deltagare innan du lägger till spel.")
      } else if (result.reason === "device-limit") {
        setError("Max ett spel per enhet och runda.")
      } else if (result.reason === "user-limit") {
        setError("Den spelaren har redan ett spel i denna runda.")
      } else if (result.reason === "not-found") {
        setError("Hittade inte spelaren. Uppdatera listan och försök igen.")
      } else {
        setError("Kunde inte lägga till spelet. Försök igen.")
      }
      return
    }

    setError(null)
    setSuccessMessage(`"${slotName}" har lagts till för ${targetUserName}!`)
  }

  const handleRandomPick = async () => {
    if (isSpinning || (isLocked && !selectedUserId)) {
      setError("Hjulet snurrar just nu. Vänta tills rundan är klar.")
      setSuccessMessage(null)
      return
    }

    const targetUserId = selectedUserId || currentUser?.id || ""
    const targetUserName = selectedUserId
      ? (users.find((user) => user.id === selectedUserId)?.name ?? "spelaren")
      : (currentUser?.name ?? "spelaren")

    if (!targetUserId) {
      setError("Välj en spelare innan du slumpas fram ett spel.")
      setSuccessMessage(null)
      return
    }

    const lowerCaseGames = new Set(games.map((game) => game.name.toLowerCase()))
    const availableOptions = UNDECIDED_SLOTS.filter(
      (slot) => !lowerCaseGames.has(slot.toLowerCase()),
    )
    if (availableOptions.length === 0) {
      setError("Alla slumpförslag finns redan på hjulet just nu.")
      setSuccessMessage(null)
      return
    }

    const chosenName = availableOptions[Math.floor(Math.random() * availableOptions.length)]

    let result: { success: boolean; reason?: string }
    if (selectedUserId) {
      result = await adminAddGameForUser({ userId: selectedUserId, name: chosenName })
    } else {
      result = await addGame(chosenName)
    }

    if (!result.success) {
      setSuccessMessage(null)
      if (result.reason === "duplicate") {
        setError(`"${chosenName}" fanns redan på hjulet. Försök igen.`)
      } else if (result.reason === "network") {
        setError("Det gick inte att spara spelet. Försök igen om en stund.")
      } else if (result.reason === "no-user") {
        setError("Registrera en deltagare innan du lägger till spel.")
      } else if (result.reason === "device-limit") {
        setError("Max ett spel per enhet och runda.")
      } else if (result.reason === "user-limit") {
        setError("Den spelaren har redan ett spel i denna runda.")
      } else if (result.reason === "not-found") {
        setError("Hittade inte spelaren. Uppdatera listan och försök igen.")
      } else {
        setError("Kunde inte lägga till spelet. Försök igen.")
      }
      return
    }

    setError(null)
    setSuccessMessage(`"${chosenName}" har slumpats fram för ${targetUserName}!`)
  }

  const handleRemoveGame = async (id: string) => {
    if (isSpinning || isLocked || isLoading) {
      setError("Du kan inte ändra spelen medan hjulet snurrar.")
      return
    }

    const result = await removeGame(id)

    if (!result.success) {
      if (result.reason === "network") {
        setError("Det gick inte att ta bort spelet. Försök igen.")
      } else if (result.reason === "not-found") {
        setError("Spelet fanns redan inte kvar.")
      }
    }
  }

  const handleScrapeGames = async () => {
    setIsScrapingGames(true)
    setError(null)
    setScrapeResults(null)

    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5174"
      const response = await fetch(`${API_BASE}/admin/scrape-games`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.error || "Failed to scrape games")
        return
      }

      const { scrapeStats, updateStats } = data
      let resultMessage = `Scraping lyckades! ${scrapeStats.successCount}/${scrapeStats.totalProviders} leverantörer uppdaterade.\n\n`

      if (updateStats) {
        const providers = Object.keys(updateStats)
        if (providers.length > 0) {
          resultMessage += "Uppdateringar:\n"
          for (const providerId of providers) {
            const stat = updateStats[providerId]
            if (stat.added > 0) {
              resultMessage += `• ${providerId}: +${stat.added} nya spel (totalt ${stat.newCount})\n`
            }
          }
        }
      }

      resultMessage += "\nOBS: Ladda om sidan för att se de nya spelen i sökresultaten."

      setScrapeResults(resultMessage)
      setSuccessMessage("Spelets databas har uppdaterats!")
    } catch (error) {
      setError(
        error instanceof Error ? `Fel vid scraping: ${error.message}` : "Ett okänt fel inträffade",
      )
    } finally {
      setIsScrapingGames(false)
    }
  }

  const joinUrl = typeof window !== "undefined" ? `${window.location.origin}/join` : "/join"

  const fullscreenOverlay =
    showFullscreen && typeof document !== "undefined"
      ? createPortal(
          <div className="wheel-overlay" role="presentation">
            <div className="wheel-overlay__inner">
              <div className="wheel-wrapper wheel-wrapper--fullscreen">
                <Wheel
                  items={games.map((game) => game.name)}
                  rotation={rotation}
                  isSpinning={isSpinning}
                  onTransitionEnd={handleSpinEnd}
                />
                <div className="wheel-pointer wheel-pointer--fullscreen" aria-hidden="true" />
              </div>
              <p className="wheel-overlay__text">Snurrar…</p>
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <div className="admin-page">
      <header className="page-header">
        <h1>Spelhjulet</h1>
        <p>
          Lägg till förslag på spel som ska delta i dragningen. När alla har anmält sig snurrar du
          hjulet för att se vad som spelas härnäst.
        </p>
        <div className="admin-actions">
          <button
            className={`primary-button${buttonPulse ? " primary-button--pulse" : ""}${
              isSpinning ? " primary-button--spinning" : ""
            }`}
            onClick={handleSpin}
            disabled={!canSpin}
          >
            {isSpinning ? "Snurrar…" : "Snurra hjulet"}
          </button>
          {(isSpinning || isLocked) && (
            <button
              className="emergency-button"
              onClick={handleEmergencyReset}
              title="Avbryt snurret och återställ hjulet"
            >
              🛑 Avbryt snurr
            </button>
          )}
          <p className="status-text">{helperText}</p>
          {winnerGame && !isSpinning && !isLoading && (
            <p className="winner">
              Näst på tur: <span>{winnerGame.name}</span>
            </p>
          )}
        </div>
      </header>

      <main className="admin-layout">
        <section className="controls-panel">
          <div className="slot-search">
            <h2>Lägg till spel</h2>
            <div className="admin-user-tools">
              <form className="admin-user-tools__form" onSubmit={handleCreateUser}>
                <label htmlFor="admin-new-user">Skapa spelare</label>
                <div className="admin-user-tools__form-fields">
                  <input
                    id="admin-new-user"
                    value={newUserName}
                    onChange={(event) => setNewUserName(event.target.value)}
                    placeholder="Spelarens namn"
                    autoComplete="off"
                    disabled={isLoading || isSpinning}
                  />
                  <button
                    type="submit"
                    className="secondary-button"
                    disabled={isLoading || isSpinning}
                  >
                    Skapa spelare
                  </button>
                </div>
              </form>

              <div className="admin-user-tools__select">
                <label htmlFor="admin-player-select">Lägg till spel åt</label>
                {users.length === 0 ? (
                  <p className="admin-user-tools__hint">
                    Inga spelare än. Skapa en eller be någon ansluta.
                  </p>
                ) : (
                  <select
                    id="admin-player-select"
                    value={selectedUserId}
                    onChange={(event) => setSelectedUserId(event.target.value)}
                    disabled={isLoading || isSpinning}
                  >
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                    {currentUser && !users.some((user) => user.id === currentUser.id) && (
                      <option value={currentUser.id}>{currentUser.name}</option>
                    )}
                  </select>
                )}
              </div>
            </div>
            <div className="slot-search__controls">
              <input
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Sök efter spel eller leverantör"
                autoComplete="off"
                disabled={isLoading || isSpinning}
              />
              <button
                type="button"
                className="secondary-button"
                onClick={handleRandomPick}
                disabled={isLoading || isSpinning || (!selectedUserId && isLocked)}
                title="Slumpa fram ett förslag åt osäkra spelare"
              >
                Slumpa spel
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={handleScrapeGames}
                disabled={isScrapingGames}
                title="Hämta de senaste spelen från leverantörernas webbplatser"
              >
                {isScrapingGames ? "Uppdaterar..." : "🔄 Uppdatera spellista"}
              </button>
              <p className="slot-search__hint">
                Förslag från NetEnt, Hacksaw Gaming, Play'n GO, Pragmatic Play, Nolimit City, Push
                Gaming och ELK Studios.
              </p>
            </div>
            {error && <p className="form-error">{error}</p>}
            {successMessage && <p className="form-success">{successMessage}</p>}
            {scrapeResults && (
              <div className="form-info" style={{ whiteSpace: "pre-line" }}>
                {scrapeResults}
              </div>
            )}
            {searchTerm.trim() ? (
              <ul className="slot-search__results">
                {filteredSlots.length === 0 ? (
                  <li className="slot-search__empty">Inga spel matchade sökningen.</li>
                ) : (
                  filteredSlots.map((slot) => (
                    <li key={`${slot.provider}-${slot.name}`}>
                      <div>
                        <span className="slot-search__name">{slot.name}</span>
                        <span className="slot-search__provider">{slot.provider}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(event) => handleQuickAdd(event, slot.name)}
                        disabled={isLoading || isSpinning || (isLocked && !selectedUserId)}
                      >
                        Lägg till
                      </button>
                    </li>
                  ))
                )}
              </ul>
            ) : (
              <div className="slot-provider-list">
                {SLOT_PROVIDERS.map((provider) => {
                  const gamesForProvider = SLOT_GAMES_BY_PROVIDER[provider.id]
                  const isExpanded = Boolean(expandedProviders[provider.id])

                  return (
                    <div
                      className={`slot-provider${isExpanded ? " slot-provider--open" : ""}`}
                      key={provider.id}
                    >
                      <button
                        type="button"
                        className="slot-provider__toggle"
                        onClick={() => toggleProvider(provider.id)}
                      >
                        <span>{provider.name}</span>
                        <span className="slot-provider__count">{gamesForProvider.length} spel</span>
                      </button>
                      {isExpanded && (
                        <ul className="slot-search__results slot-provider__results">
                          {gamesForProvider.map((slotName) => (
                            <li key={`${provider.id}-${slotName}`}>
                              <div>
                                <span className="slot-search__name">{slotName}</span>
                                <span className="slot-search__provider">{provider.name}</span>
                              </div>
                              <button
                                type="button"
                                onClick={(event) => handleQuickAdd(event, slotName)}
                                disabled={isLoading || isSpinning || (isLocked && !selectedUserId)}
                              >
                                Lägg till
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="join-info">
            <p>Dela länken så att spelarna kan lägga till sina förslag:</p>
            <code>{joinUrl}</code>
            {(isSpinning || isLocked) && <span>Hjulet är låst medan det snurrar.</span>}
          </div>
        </section>

        <section className="controls-panel">
          <div className="game-list">
            <h2>Insamlade spel</h2>
            {games.length === 0 ? (
              <p className="empty-state">Inga spel ännu. Be deltagarna lägga till!</p>
            ) : (
              <ul>
                {games.map((game) => (
                  <li key={game.id}>
                    <span>{game.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveGame(game.id)}
                      disabled={isSpinning || isLoading || isLocked}
                      aria-label={`Ta bort ${game.name}`}
                    >
                      Ta bort
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="controls-panel">
          <div className="game-list">
            <h2>Topplista</h2>
            {users.length === 0 ? (
              <p className="empty-state">
                Inga resultat ännu. Snurra hjulet för att starta listan.
              </p>
            ) : (
              <ul>
                {users.map((user) => (
                  <li key={user.id}>
                    <span>{user.name}</span>
                    <span
                      className={`score-badge ${
                        user.totalProfit >= 0 ? "score-badge--positive" : "score-badge--negative"
                      }`}
                    >
                      {user.totalProfit >= 0 ? "+" : ""}
                      {user.totalProfit.toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="controls-panel">
          <div className="game-list">
            <h2>Anslutna enheter</h2>
            {connectedDevices.length === 0 ? (
              <p className="empty-state">Inga enheter anslutna.</p>
            ) : (
              <ul>
                {connectedDevices.map((device) => (
                  <li key={device.deviceId}>
                    <span>{device.userName}</span>
                    <span
                      className="score-badge"
                      style={{
                        backgroundColor: device.hasSubmitted ? "#4CAF50" : "#9E9E9E",
                      }}
                    >
                      {device.hasSubmitted ? "Lagt till spel" : "Väntar"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="controls-panel">
          <div className="game-list">
            <h2>Leverantörsstatistik</h2>
            {providerStats.length === 0 ? (
              <p className="empty-state">
                Ingen statistik ännu. Spela några rundor för att se vilka leverantörer som presterar
                bäst!
              </p>
            ) : (
              <ul>
                {providerStats.map((stat) => (
                  <li key={stat.provider}>
                    <div>
                      <span>{stat.provider}</span>
                      <span className="provider-games-count">{stat.gamesPlayed} spel</span>
                    </div>
                    <span
                      className={`score-badge ${
                        stat.totalProfit >= 0 ? "score-badge--positive" : "score-badge--negative"
                      }`}
                    >
                      {stat.totalProfit >= 0 ? "+" : ""}
                      {stat.totalProfit.toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>

      {fullscreenOverlay}
      {showWinnerScreen && winnerGame && (
        <WinnerScreen
          gameName={winnerGame.name}
          userName={users.find((user) => user.id === winnerGame.userId)?.name ?? "Okänd spelare"}
          onSubmitResult={handleWinnerResultSubmit}
          onClose={handleWinnerScreenClose}
        />
      )}
      {bonusTriggered && (
        <BonusWheel
          onSpin={spinBonus}
          onComplete={(amount) => {
            clearBonus()
            setSuccessMessage(`Bonushjulet gav ${amount}kr!`)
            setTimeout(() => setSuccessMessage(null), 5000)
          }}
        />
      )}
    </div>
  )
}

export default AdminPage
