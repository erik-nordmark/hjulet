import { useMemo, useState } from "react"
import type { ChangeEvent, FormEvent, MouseEvent } from "react"
import {
  SLOT_GAMES,
  SLOT_GAMES_BY_PROVIDER,
  SLOT_PROVIDERS,
  type SlotGame,
  type SlotProviderId,
} from "../data/slots"
import { UNDECIDED_SLOTS } from "../data/undecidedSlots"
import { useGames } from "../context/GameContext"

const PlayerPage = () => {
  const {
    games,
    users,
    providerStats,
    currentUser,
    registerUser,
    isLoading,
    isLocked,
    deviceLimit,
    hasSubmitted,
    addGame,
  } = useGames()

  const [nameValue, setNameValue] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [customGameValue, setCustomGameValue] = useState("")
  const [expandedProviders, setExpandedProviders] = useState<
    Partial<Record<SlotProviderId, boolean>>
  >({})
  const [isRegistering, setIsRegistering] = useState(false)

  const totalGamesMessage = useMemo(() => {
    if (isLoading) {
      return "Laddar spel…"
    }

    if (!currentUser) {
      return "Registrera dig för att lägga till spel."
    }

    if (isLocked) {
      return "Hjulet snurrar just nu. Vänta på nästa runda!"
    }

    if (games.length === 0) {
      return "Det finns inga spel ännu. Var först med ett förslag!"
    }

    if (games.length === 1) {
      return "1 spel väntar på hjulet."
    }

    return `${games.length} spel ligger just nu på hjulet.`
  }, [games.length, isLoading, isLocked, currentUser])

  const filteredSlots = useMemo<SlotGame[]>(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) {
      return SLOT_GAMES.slice(0, 25)
    }

    return SLOT_GAMES.filter(
      (slot) =>
        slot.name.toLowerCase().includes(query) || slot.provider.toLowerCase().includes(query)
    ).slice(0, 60)
  }, [searchTerm])

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmed = nameValue.trim()
    if (!trimmed) {
      setError("Ange ett namn för att spela med.")
      return
    }

    setIsRegistering(true)
    const result = await registerUser(trimmed)
    setIsRegistering(false)

    if (!result.success) {
      setError(result.message ?? "Kunde inte spara namnet. Försök igen.")
      return
    }

    setNameValue("")
    setError(null)
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

  const handleQuickAdd = async (event: MouseEvent<HTMLButtonElement>, slotName: string) => {
    event.preventDefault()

    if (isLocked) {
      setError("Hjulet snurrar just nu. Försök igen när rundan är klar.")
      setSuccessMessage(null)
      return
    }

    if (!currentUser) {
      setError("Registrera dig innan du lägger till spel.")
      setSuccessMessage(null)
      return
    }

    if (hasSubmitted) {
      setError(`Denna enhet har redan lagt till ${deviceLimit} spel i den här rundan.`)
      setSuccessMessage(null)
      return
    }

    const result = await addGame(slotName)

    if (!result.success) {
      if (result.reason === "duplicate") {
        setError("Det spelet finns redan på hjulet.")
      } else if (result.reason === "device-limit") {
        setError(`Max ${deviceLimit} spel per enhet.`)
      } else if (result.reason === "network") {
        setError("Kunde inte nå servern. Försök igen om en stund.")
      } else if (result.reason === "no-user") {
        setError("Registrera dig innan du lägger till spel.")
      } else {
        setError("Kunde inte lägga till spelet. Försök igen.")
      }
      setSuccessMessage(null)
      return
    }

    setError(null)
    setSuccessMessage(`"${slotName}" ligger nu på hjulet!`)
  }

  const handleRandomPick = async () => {
    if (isLocked) {
      setError("Hjulet snurrar just nu. Försök igen när rundan är klar.")
      setSuccessMessage(null)
      return
    }

    if (!currentUser) {
      setError("Registrera dig innan du lägger till spel.")
      setSuccessMessage(null)
      return
    }

    if (hasSubmitted) {
      setError(`Denna enhet har redan lagt till ${deviceLimit} spel i den här rundan.`)
      setSuccessMessage(null)
      return
    }

    const lowerCaseGames = new Set(games.map((game) => game.name.toLowerCase()))
    const availableOptions = UNDECIDED_SLOTS.filter(
      (slot) => !lowerCaseGames.has(slot.toLowerCase())
    )

    if (availableOptions.length === 0) {
      setError("Alla slumpförslag finns redan på hjulet just nu.")
      setSuccessMessage(null)
      return
    }

    const chosenName = availableOptions[Math.floor(Math.random() * availableOptions.length)]
    const result = await addGame(chosenName)

    if (!result.success) {
      setSuccessMessage(null)
      if (result.reason === "duplicate") {
        setError(`"${chosenName}" finns redan på hjulet.`)
      } else if (result.reason === "device-limit") {
        setError(`Max ${deviceLimit} spel per enhet.`)
      } else if (result.reason === "network") {
        setError("Kunde inte nå servern. Försök igen om en stund.")
      } else if (result.reason === "no-user") {
        setError("Registrera dig innan du lägger till spel.")
      } else {
        setError("Kunde inte lägga till spelet. Försök igen.")
      }
      return
    }

    setError(null)
    setSuccessMessage(`"${chosenName}" slumpades fram och lades till på hjulet!`)
  }

  const handleCustomGameAdd = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const gameName = customGameValue.trim()
    if (!gameName) {
      setError("Ange ett spel att lägga till.")
      return
    }

    if (isLocked) {
      setError("Hjulet snurrar just nu. Försök igen när rundan är klar.")
      setSuccessMessage(null)
      return
    }

    if (!currentUser) {
      setError("Registrera dig innan du lägger till spel.")
      setSuccessMessage(null)
      return
    }

    if (hasSubmitted) {
      setError(`Denna enhet har redan lagt till ${deviceLimit} spel i den här rundan.`)
      setSuccessMessage(null)
      return
    }

    const result = await addGame(gameName)

    if (!result.success) {
      if (result.reason === "duplicate") {
        setError("Det spelet finns redan på hjulet.")
      } else if (result.reason === "device-limit") {
        setError(`Max ${deviceLimit} spel per enhet.`)
      } else if (result.reason === "network") {
        setError("Kunde inte nå servern. Försök igen om en stund.")
      } else if (result.reason === "no-user") {
        setError("Registrera dig innan du lägger till spel.")
      } else {
        setError("Kunde inte lägga till spelet. Försök igen.")
      }
      setSuccessMessage(null)
      return
    }

    setError(null)
    setCustomGameValue("")
    setSearchTerm("")
    setSuccessMessage(`"${gameName}" ligger nu på hjulet!`)
  }

  return (
    <div className="player-page">
      {!currentUser && (
        <div className="player-overlay" role="dialog" aria-modal="true">
          <form className="player-overlay__card" onSubmit={handleRegister}>
            <h2>Välkommen!</h2>
            <p>Ange ditt namn för att vara med i snurret.</p>
            <input
              value={nameValue}
              onChange={(event) => setNameValue(event.target.value)}
              placeholder="Ditt namn"
              autoFocus
              disabled={isRegistering}
            />
            <button type="submit" className="primary-button" disabled={isRegistering}>
              {isRegistering ? "Sparar…" : "Klart!"}
            </button>
            {error && <p className="form-error">{error}</p>}
          </form>
        </div>
      )}

      <header className="page-header">
        <h1>Gå med i hjulet</h1>
        <p>
          Skriv in vilket spel du vill spela den här rundan och skicka in det till hjulet. När allt
          är klart snurrar värden och meddelar resultatet.
        </p>
      </header>

      <main className="player-content">
        <section className="player-panel">
          {currentUser && <p className="status-text">Du spelar som {currentUser.name}.</p>}
          {hasSubmitted && (
            <p className="form-success">
              Du har redan lagt till {deviceLimit} spel denna runda. Vänta på nästa snurr!
            </p>
          )}
          {error && <p className="form-error">{error}</p>}
          {successMessage && <p className="form-success">{successMessage}</p>}
        </section>

        <section className="slot-search">
          <h2>Sök efter slots</h2>
          <div className="slot-search__controls">
            <input
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Sök efter spel eller leverantör"
              autoComplete="off"
              disabled={isLoading}
            />
            <button
              type="button"
              className="secondary-button"
              onClick={handleRandomPick}
              disabled={isLoading || isLocked || hasSubmitted || !currentUser}
              title="Slumpa fram ett spel om du inte kan bestämma dig"
            >
              Slumpa spel
            </button>
            <p className="slot-search__hint">
              Förslag från NetEnt, Hacksaw Gaming, Play’n GO, Pragmatic Play, Nolimit City, Push
              Gaming och ELK Studios.
            </p>
          </div>
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
                      disabled={isLoading || isLocked || hasSubmitted || !currentUser}
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
                              disabled={isLoading || isLocked || hasSubmitted || !currentUser}
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
        </section>

        <section className="slot-search">
          <h2>Eller lägg till ditt eget spel</h2>
          <form onSubmit={handleCustomGameAdd} className="custom-game-form">
            <div className="slot-search__controls">
              <input
                value={customGameValue}
                onChange={(event) => setCustomGameValue(event.target.value)}
                placeholder="Spel som inte finns i listan"
                autoComplete="off"
                disabled={isLoading}
              />
              <button
                type="submit"
                className="secondary-button"
                disabled={isLoading || isLocked || hasSubmitted || !currentUser || !customGameValue.trim()}
              >
                Lägg till eget spel
              </button>
            </div>
          </form>
        </section>

        <section className="player-game-list">
          <h2>Spel på hjulet</h2>
          <p className="status-text">{totalGamesMessage}</p>
          {games.length > 0 ? (
            <ul>
              {games.map((game) => (
                <li key={game.id}>{game.name}</li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">Inga spel ännu – lägg till från listan ovan.</p>
          )}
        </section>

        <section className="slot-search">
          <h2>Topplista</h2>
          {users.length === 0 ? (
            <p className="empty-state">Ingen har vunnit ännu – dags att snurra!</p>
          ) : (
            <ul className="slot-search__results">
              {users.map((user) => (
                <li key={user.id}>
                  <div>
                    <span className="slot-search__name">{user.name}</span>
                    <span className="slot-search__provider">
                      Totalt {user.totalProfit >= 0 ? "+" : ""}
                      {user.totalProfit.toFixed(2)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="slot-search">
          <h2>Leverantörsstatistik</h2>
          {providerStats.length === 0 ? (
            <p className="empty-state">
              Ingen statistik ännu. Spela några rundor för att se vilka leverantörer som presterar
              bäst!
            </p>
          ) : (
            <ul className="slot-search__results">
              {providerStats.map((stat) => (
                <li key={stat.provider}>
                  <div>
                    <span className="slot-search__name">{stat.provider}</span>
                    <span className="slot-search__provider">
                      {stat.gamesPlayed} spel · {stat.totalProfit >= 0 ? "+" : ""}
                      {stat.totalProfit.toFixed(2)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}

export default PlayerPage
