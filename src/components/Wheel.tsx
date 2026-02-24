import { memo, useMemo } from "react"
import type { TransitionEvent } from "react"

type WheelProps = {
  items: string[]
  rotation: number
  isSpinning: boolean
  selectedIndex?: number
  showWinner?: boolean
  onTransitionEnd: (event: TransitionEvent<HTMLDivElement>) => void
}

type Segment = {
  path: string
  fill: string
  label: string
  textX: number
  textY: number
  textRotation: number
  id: string
}

const COLORS = [
  "#f97316",
  "#4f46e5",
  "#0ea5e9",
  "#22c55e",
  "#ef4444",
  "#a855f7",
  "#d946ef",
  "#14b8a6",
]

const polarToCartesian = (
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
) => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0

  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  }
}

const describeSegment = (
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number
) => {
  const start = polarToCartesian(centerX, centerY, radius, endAngle)
  const end = polarToCartesian(centerX, centerY, radius, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1"

  return [
    `M ${centerX} ${centerY}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    "Z",
  ].join(" ")
}

const Wheel = ({
  items,
  rotation,
  isSpinning,
  selectedIndex,
  showWinner = false,
  onTransitionEnd,
}: WheelProps) => {
  console.log("Wheel render:", {
    rotation,
    isSpinning,
    itemCount: items.length,
    selectedIndex,
    showWinner,
  })

  const segments = useMemo<Segment[]>(() => {
    if (items.length === 0) {
      return []
    }

    const radius = 150
    const center = radius + 10
    const sliceAngle = 360 / items.length

    return items.map((label, index) => {
      const startAngle = index * sliceAngle
      const endAngle = startAngle + sliceAngle
      const path = describeSegment(center, center, radius, startAngle, endAngle)
      const midAngle = startAngle + sliceAngle / 2
      const textPosition = polarToCartesian(center, center, radius * 0.6, midAngle)
      let textRotation = midAngle - 90

      if (textRotation > 90) {
        textRotation -= 180
      } else if (textRotation < -90) {
        textRotation += 180
      }

      return {
        path,
        fill: COLORS[index % COLORS.length],
        label,
        textX: textPosition.x,
        textY: textPosition.y,
        textRotation,
        id: `${index}-${label}`,
      }
    })
  }, [items])

  if (segments.length === 0) {
    return (
      <div className="wheel wheel--empty">
        <div className="wheel__empty-message">Lägg till spel för att kunna snurra</div>
      </div>
    )
  }

  return (
    <div
      className="wheel"
      style={{
        transform: `rotate(${rotation}deg)`,
        transition: isSpinning
          ? "transform 4s cubic-bezier(0.25, 0.1, 0.25, 1)"
          : "transform 0s ease-out",
      }}
      onTransitionEnd={(event) => {
        console.log("Transition ended:", event.propertyName, "rotation:", rotation)
        if (event.propertyName === "transform") {
          onTransitionEnd(event)
        }
      }}
    >
      <svg viewBox="0 0 320 320" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="6" stdDeviation="6" floodOpacity="0.2" />
          </filter>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="flame1" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.9">
              <animate
                attributeName="stop-opacity"
                values="0.9;0.6;0.9"
                dur="0.8s"
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="30%" stopColor="#f97316" stopOpacity="0.7">
              <animate
                attributeName="stop-opacity"
                values="0.7;0.4;0.7"
                dur="0.6s"
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="100%" stopColor="#dc2626" stopOpacity="0.3">
              <animate
                attributeName="stop-opacity"
                values="0.3;0.1;0.3"
                dur="1s"
                repeatCount="indefinite"
              />
            </stop>
          </radialGradient>
          <radialGradient id="flame2" cx="50%" cy="50%" r="30%">
            <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.8">
              <animate
                attributeName="stop-opacity"
                values="0.8;0.5;0.8"
                dur="0.5s"
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="70%" stopColor="#fbbf24" stopOpacity="0.4">
              <animate
                attributeName="stop-opacity"
                values="0.4;0.2;0.4"
                dur="0.7s"
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="100%" stopColor="#f97316" stopOpacity="0.1" />
          </radialGradient>
        </defs>
        <g filter="url(#shadow)">
          <circle cx="160" cy="160" r="155" fill="#0f172a" />
          {segments.map(({ id, path, fill, label, textX, textY, textRotation }, index) => {
            const isSelected = showWinner && selectedIndex === index
            return (
              <g key={id}>
                <path
                  d={path}
                  fill={isSelected ? "url(#flame1)" : fill}
                  stroke={isSelected ? "#fbbf24" : "#0f172a"}
                  strokeWidth={isSelected ? "3" : "1.5"}
                  filter={isSelected ? "url(#glow)" : "none"}
                >
                  {isSelected && (
                    <animate
                      attributeName="stroke-width"
                      values="3;5;3"
                      dur="1s"
                      repeatCount="indefinite"
                    />
                  )}
                </path>
                {isSelected && (
                  <>
                    <path d={path} fill="url(#flame2)" stroke="none" opacity="0.6">
                      <animate
                        attributeName="opacity"
                        values="0.6;0.3;0.6"
                        dur="0.8s"
                        repeatCount="indefinite"
                      />
                    </path>
                    <circle cx={textX} cy={textY} r="8" fill="#fbbf24" opacity="0.4">
                      <animate
                        attributeName="r"
                        values="8;12;8"
                        dur="1.2s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="0.4;0.1;0.4"
                        dur="1.2s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  </>
                )}
                <text
                  x={textX}
                  y={textY}
                  fill={isSelected ? "#fef3c7" : "#fffffe"}
                  fontSize={isSelected ? "16" : "14"}
                  fontWeight={isSelected ? "bold" : "normal"}
                  textAnchor="middle"
                  alignmentBaseline="middle"
                  transform={`rotate(${textRotation} ${textX} ${textY})`}
                  filter={isSelected ? "url(#glow)" : "none"}
                >
                  {label}
                  {isSelected && (
                    <animate
                      attributeName="font-size"
                      values="16;18;16"
                      dur="1s"
                      repeatCount="indefinite"
                    />
                  )}
                </text>
              </g>
            )
          })}
          <circle cx="160" cy="160" r="32" fill="#0f172a" stroke="#e2e8f0" />
          <circle cx="160" cy="160" r="18" fill="#e2e8f0" />
        </g>
      </svg>
    </div>
  )
}

export default memo(Wheel)
