import { useEffect, useState } from "react"
import { playApplauseSound } from "../lib/sound"

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
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.95)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        color: "white",
      }}
    >
      <h1
        style={{
          fontSize: "4rem",
          marginBottom: "3rem",
          textTransform: "uppercase",
          letterSpacing: "0.5rem",
          color: "#FFD700",
          textShadow: "0 0 20px rgba(255, 215, 0, 0.5)",
        }}
      >
        BONUS KÖP
      </h1>

      <div
        style={{
          position: "relative",
          width: "400px",
          height: "400px",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            border: "8px solid #FFD700",
            position: "relative",
            transform: `rotate(${rotation}deg)`,
            transition: isSpinning ? "transform 3s cubic-bezier(0.25, 0.1, 0.25, 1)" : "none",
            background:
              "conic-gradient(#FF6B6B 0deg 90deg, #4ECDC4 90deg 180deg, #95E1D3 180deg 270deg, #FFE66D 270deg 360deg)",
            boxShadow: "0 0 40px rgba(255, 215, 0, 0.3)",
          }}
        >
          {PRIZES.map((prize, index) => {
            const angle = index * 90 + 45
            const radian = (angle * Math.PI) / 180
            const x = 50 + 35 * Math.cos(radian)
            const y = 50 + 35 * Math.sin(radian)

            return (
              <div
                key={prize}
                style={{
                  position: "absolute",
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: `translate(-50%, -50%) rotate(${angle + 90}deg)`,
                  fontSize: "2rem",
                  fontWeight: "bold",
                  color: "white",
                  textShadow: "2px 2px 4px rgba(0, 0, 0, 0.8)",
                }}
              >
                {prize}kr
              </div>
            )
          })}
        </div>

        {/* Pointer */}
        <div
          style={{
            position: "absolute",
            top: "-30px",
            left: "50%",
            transform: "translateX(-50%)",
            width: 0,
            height: 0,
            borderLeft: "20px solid transparent",
            borderRight: "20px solid transparent",
            borderTop: "40px solid #FFD700",
            filter: "drop-shadow(0 0 10px rgba(255, 215, 0, 0.5))",
          }}
        />
      </div>

      {result && (
        <div
          style={{
            marginTop: "3rem",
            fontSize: "3rem",
            fontWeight: "bold",
            color: "#FFD700",
            textShadow: "0 0 20px rgba(255, 215, 0, 0.8)",
            animation: "pulse 1s infinite",
          }}
        >
          DU VANN {result}kr!
        </div>
      )}
    </div>
  )
}
