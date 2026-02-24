import { useEffect, useMemo, useState } from "react"
import { playWinSound } from "../lib/sound"

type WinnerScreenProps = {
  gameName: string
  userName: string
  onSubmitResult: (before: number, after: number) => Promise<{ success: boolean; message?: string }>
  onClose: () => void
}

const WinnerScreen = ({ gameName, userName, onSubmitResult, onClose }: WinnerScreenProps) => {
  const [beforeValue, setBeforeValue] = useState("")
  const [afterValue, setAfterValue] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [showParticles, setShowParticles] = useState(false)

  useEffect(() => {
    playWinSound()
    const timer = setTimeout(() => setShowParticles(true), 400)

    // Load saved current balance from localStorage
    const savedBalance = localStorage.getItem("currentBalance")
    if (savedBalance) {
      setBeforeValue(savedBalance)
    }

    return () => clearTimeout(timer)
  }, [])

  const handleSubmit = async () => {
    const before = Number(beforeValue.replace(",", "."))
    const after = Number(afterValue.replace(",", "."))

    if (!Number.isFinite(before) || !Number.isFinite(after)) {
      setError("Ange giltiga siffror för saldo före och efter spelet.")
      return
    }

    setIsSaving(true)
    const result = await onSubmitResult(before, after)
    setIsSaving(false)

    if (!result.success) {
      setError(result.message ?? "Kunde inte spara resultatet. Försök igen.")
      return
    }

    // Save the "after" value as the new current balance for next time
    localStorage.setItem("currentBalance", after.toString())

    onClose()
  }

  const delta = useMemo(() => {
    const before = Number(beforeValue.replace(",", "."))
    const after = Number(afterValue.replace(",", "."))
    if (!Number.isFinite(before) || !Number.isFinite(after)) {
      return null
    }
    return after - before
  }, [beforeValue, afterValue])

  return (
    <div className="winner-screen" role="dialog" aria-modal="true">
      <div className="winner-screen__background">
        {showParticles &&
          [...Array(24)].map((_, index) => (
            <div
              key={index}
              className="confetti-particle"
              style={
                {
                  "--delay": `${index * 0.1}s`,
                  "--x": `${Math.random() * 100}%`,
                  "--rotation": `${Math.random() * 360}deg`,
                  "--color": ["#fbbf24", "#f97316", "#dc2626", "#7c3aed", "#06b6d4", "#10b981"][
                    Math.floor(Math.random() * 6)
                  ],
                } as React.CSSProperties
              }
            />
          ))}
      </div>

      <div className="winner-screen__panel">
        <header className="winner-screen__header">
          <span aria-hidden>🎉</span>
          <h1>Vi har en vinnare!</h1>
          <span aria-hidden>🎉</span>
        </header>

        <section className="winner-screen__body">
          <div className="winner-screen__summary">
            <p className="winner-screen__label">Spel</p>
            <h2 className="winner-screen__value">{gameName}</h2>
            <p className="winner-screen__label">Inlämnat av</p>
            <h3 className="winner-screen__value winner-screen__value--secondary">{userName}</h3>
          </div>

          <div className="winner-screen__form">
            <label>
              Saldo före spelet
              <input
                type="number"
                step="0.01"
                value={beforeValue}
                onChange={(event) => setBeforeValue(event.target.value)}
                placeholder="t.ex. 500"
                min="0"
              />
              {beforeValue && (
                <button
                  type="button"
                  className="clear-value-button"
                  onClick={() => setBeforeValue("")}
                  title="Rensa värdet"
                >
                  ✕
                </button>
              )}
            </label>
            <label>
              Saldo efter spelet
              <input
                type="number"
                step="0.01"
                value={afterValue}
                onChange={(event) => setAfterValue(event.target.value)}
                placeholder="t.ex. 720"
                min="0"
              />
              {afterValue && (
                <button
                  type="button"
                  className="clear-value-button"
                  onClick={() => setAfterValue("")}
                  title="Rensa värdet"
                >
                  ✕
                </button>
              )}
            </label>

            {delta !== null && (
              <p
                className={`winner-screen__delta ${
                  delta >= 0 ? "winner-screen__delta--up" : "winner-screen__delta--down"
                }`}
              >
                {delta >= 0 ? "Vinst" : "Förlust"}: {delta.toFixed(2)} kr
              </p>
            )}

            {error && <p className="form-error winner-screen__error">{error}</p>}
          </div>
        </section>

        <footer className="winner-screen__actions">
          <button className="primary-button" onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? "Sparar…" : "Spara resultat"}
          </button>
          <button className="secondary-button" onClick={onClose} disabled={isSaving}>
            Avbryt
          </button>
        </footer>
      </div>
    </div>
  )
}

export default WinnerScreen
