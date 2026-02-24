import { useState } from "react"
import { useNavigate } from "react-router-dom"

const ResetPage = () => {
  const [isResetting, setIsResetting] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleReset = async () => {
    if (!confirm("Är du säker på att du vill nollställa ALLT? Detta kan inte ångras.")) {
      return
    }

    setIsResetting(true)
    setError(null)

    try {
      // Reset server data
      const response = await fetch(
        import.meta.env.VITE_API_BASE_URL
          ? `${import.meta.env.VITE_API_BASE_URL}/reset`
          : `${window.location.protocol}//${window.location.hostname}:5174/reset`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`)
      }

      // Reset local storage
      localStorage.removeItem("currentBalance")

      setIsComplete(true)

      // Auto redirect after 3 seconds
      setTimeout(() => {
        navigate("/admin")
      }, 3000)
    } catch (err) {
      console.error("Reset failed:", err)
      setError(err instanceof Error ? err.message : "Okänt fel uppstod")
    } finally {
      setIsResetting(false)
    }
  }

  if (isComplete) {
    return (
      <div className="reset-page reset-page--success">
        <div className="reset-content">
          <h1>🎯 Reset genomförd!</h1>
          <p>Alla användare och summor har nollställts.</p>
          <p>Omdirigerar till admin-sidan om 3 sekunder...</p>
          <button className="primary-button" onClick={() => navigate("/admin")}>
            Gå till admin-sidan nu
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="reset-page">
      <div className="reset-content">
        <h1>⚠️ System Reset</h1>
        <div className="reset-warning">
          <p>
            <strong>VARNING:</strong> Denna åtgärd kommer att:
          </p>
          <ul>
            <li>Radera alla användare från systemet</li>
            <li>Nollställa alla sparade summor och saldon</li>
            <li>Rensa all lokal lagrad data</li>
            <li>Återställa systemet till ursprungsläge</li>
          </ul>
          <p className="reset-notice">
            <strong>Detta kan inte ångras!</strong>
          </p>
        </div>

        {error && (
          <div className="reset-error">
            <p>❌ Reset misslyckades: {error}</p>
          </div>
        )}

        <div className="reset-actions">
          <button className="danger-button" onClick={handleReset} disabled={isResetting}>
            {isResetting ? "Nollställer..." : "🗑️ Nollställ allt"}
          </button>
          <button
            className="secondary-button"
            onClick={() => navigate("/admin")}
            disabled={isResetting}
          >
            Avbryt
          </button>
        </div>
      </div>
    </div>
  )
}

export default ResetPage
