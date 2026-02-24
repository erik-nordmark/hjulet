import { useEffect, useState } from "react"
import { playApplauseSound } from "../lib/sound"
import "./BonusWheel.css"

type BonusWheelProps = {
  onComplete: (amount: number) => void
  onSpin: () => Promise<number | null>
}

const PRIZES = [200, 400, 600, 800]

export const BonusWheel = ({ onComplete, onSpin }: BonusWheelProps) => {
  const [isSpinning, setIsSpinning] = useState(false)
  const [result, setResult] = useState<number | null>(null)
  const [rotation, setRotation] = useState(0)

  useEffect(() => {
    const spin = async () => {
      setIsSpinning(true)

      // Spin animation
      const spins = 5 + Math.random() * 3 // 5-8 full rotations
      const targetRotation = spins * 360

      setRotation(targetRotation)

      // Wait for spin animation
      await new Promise((resolve) => setTimeout(resolve, 3000))

      // Get result from backend
      const amount = await onSpin()

      if (amount) {
        setResult(amount)
        playApplauseSound()

        // Show result for 3 seconds
        setTimeout(() => {
          onComplete(amount)
        }, 3000)
      }
    }

    spin()
  }, [onSpin, onComplete])

  return (
    <div className="bonus-wheel-overlay" role="dialog" aria-modal="true" aria-labelledby="bonus-wheel-title">
      <h1 id="bonus-wheel-title" className="bonus-wheel__title">
        BONUS KÖP
      </h1>

      <div className="bonus-wheel__container">
        <div
          className={`bonus-wheel__wheel ${isSpinning ? "bonus-wheel__wheel--spinning" : ""}`}
          style={{ transform: `rotate(${rotation}deg)` }}
          aria-live="polite"
          aria-busy={isSpinning}
        >
          {PRIZES.map((prize, index) => {
            const angle = index * 90 + 45
            const radian = (angle * Math.PI) / 180
            const x = 50 + 35 * Math.cos(radian)
            const y = 50 + 35 * Math.sin(radian)

            return (
              <div
                key={prize}
                className="bonus-wheel__prize"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: `translate(-50%, -50%) rotate(${angle + 90}deg)`,
                }}
                aria-hidden="true"
              >
                {prize}kr
              </div>
            )
          })}
        </div>

        <div className="bonus-wheel__pointer" aria-hidden="true" />
      </div>

      {result && (
        <div className="bonus-wheel__result" role="status" aria-live="assertive">
          DU VANN {result}kr!
        </div>
      )}
    </div>
  )
}
