let audioContext: AudioContext | null = null

const ensureContext = () => {
  if (typeof window === "undefined" || typeof window.AudioContext !== "function") {
    return null
  }

  if (!audioContext) {
    audioContext = new AudioContext()
  }

  return audioContext
}

type ToneOptions = {
  duration: number
  startFrequency: number
  endFrequency: number
  type?: OscillatorType
  gainStart?: number
  gainEnd?: number
}

const playTone = ({
  duration,
  startFrequency,
  endFrequency,
  type = "sine",
  gainStart = 0.3,
  gainEnd = 0,
}: ToneOptions) => {
  const ctx = ensureContext()
  if (!ctx) {
    return
  }

  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()

  oscillator.type = type
  oscillator.frequency.setValueAtTime(startFrequency, ctx.currentTime)
  oscillator.frequency.exponentialRampToValueAtTime(
    Math.max(endFrequency, 20),
    ctx.currentTime + duration
  )

  gain.gain.setValueAtTime(gainStart, ctx.currentTime)
  gain.gain.linearRampToValueAtTime(gainEnd, ctx.currentTime + duration)

  oscillator.connect(gain)
  gain.connect(ctx.destination)

  oscillator.start(ctx.currentTime)
  oscillator.stop(ctx.currentTime + duration + 0.05)
}

export const playSpinSound = () => {
  playTone({
    duration: 1.2,
    startFrequency: 220,
    endFrequency: 720,
    type: "sawtooth",
    gainStart: 0.18,
    gainEnd: 0.01,
  })
}

export const playWinSound = () => {
  playTone({
    duration: 0.35,
    startFrequency: 880,
    endFrequency: 880,
    type: "triangle",
    gainStart: 0.22,
    gainEnd: 0.04,
  })

  setTimeout(() => {
    playTone({
      duration: 0.45,
      startFrequency: 660,
      endFrequency: 1320,
      type: "square",
      gainStart: 0.2,
      gainEnd: 0.01,
    })
  }, 120)
}

export const playTickSound = () => {
  playTone({
    duration: 0.08,
    startFrequency: 520,
    endFrequency: 260,
    type: "square",
    gainStart: 0.16,
    gainEnd: 0,
  })
}

export const playApplauseSound = () => {
  const ctx = ensureContext()
  if (!ctx) {
    return
  }

  const duration = 3.5

  // Create base crowd noise (continuous background)
  const noiseBufferSize = ctx.sampleRate * duration
  const noiseBuffer = ctx.createBuffer(1, noiseBufferSize, ctx.sampleRate)
  const noiseData = noiseBuffer.getChannelData(0)

  for (let i = 0; i < noiseBufferSize; i++) {
    const envelope =
      Math.min(i / (noiseBufferSize * 0.2), 1) *
      Math.min(1, (noiseBufferSize - i) / (noiseBufferSize * 0.3))
    noiseData[i] = (Math.random() * 2 - 1) * envelope * 0.08
  }

  const noiseSource = ctx.createBufferSource()
  const noiseGain = ctx.createGain()
  const noiseFilter = ctx.createBiquadFilter()

  noiseFilter.type = "bandpass"
  noiseFilter.frequency.setValueAtTime(400, ctx.currentTime)
  noiseFilter.Q.setValueAtTime(0.8, ctx.currentTime)

  noiseGain.gain.setValueAtTime(0.25, ctx.currentTime)

  noiseSource.buffer = noiseBuffer
  noiseSource.connect(noiseFilter)
  noiseFilter.connect(noiseGain)
  noiseGain.connect(ctx.destination)

  noiseSource.start(ctx.currentTime)
  noiseSource.stop(ctx.currentTime + duration)

  // Create individual claps with more variation and energy
  const numClaps = 80

  for (let i = 0; i < numClaps; i++) {
    const delay = (i / numClaps) * duration * (0.7 + Math.random() * 0.6)
    const clapDuration = 0.04 + Math.random() * 0.09

    setTimeout(() => {
      const bufferSize = ctx.sampleRate * clapDuration
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = buffer.getChannelData(0)

      for (let j = 0; j < bufferSize; j++) {
        data[j] = (Math.random() * 2 - 1) * Math.exp(-j / (bufferSize * 0.25))
      }

      const source = ctx.createBufferSource()
      const gainNode = ctx.createGain()
      const filterNode = ctx.createBiquadFilter()

      filterNode.type = "bandpass"
      filterNode.frequency.setValueAtTime(600 + Math.random() * 2800, ctx.currentTime)
      filterNode.Q.setValueAtTime(1.5 + Math.random() * 2, ctx.currentTime)

      const volume = 0.18 + Math.random() * 0.15
      gainNode.gain.setValueAtTime(volume, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + clapDuration)

      source.buffer = buffer
      source.connect(filterNode)
      filterNode.connect(gainNode)
      gainNode.connect(ctx.destination)

      source.start(ctx.currentTime)
      source.stop(ctx.currentTime + clapDuration)
    }, delay * 1000)
  }

  // Add some cheers (higher pitched bursts)
  const numCheers = 12

  for (let i = 0; i < numCheers; i++) {
    const delay = 0.3 + Math.random() * (duration - 0.5)
    const cheerDuration = 0.15 + Math.random() * 0.25

    setTimeout(() => {
      const bufferSize = ctx.sampleRate * cheerDuration
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = buffer.getChannelData(0)

      for (let j = 0; j < bufferSize; j++) {
        const t = j / bufferSize
        const envelope = Math.sin(t * Math.PI) * Math.exp(-t * 2)
        data[j] = (Math.random() * 2 - 1) * envelope
      }

      const source = ctx.createBufferSource()
      const gainNode = ctx.createGain()
      const filterNode = ctx.createBiquadFilter()

      filterNode.type = "bandpass"
      filterNode.frequency.setValueAtTime(1200 + Math.random() * 2000, ctx.currentTime)
      filterNode.Q.setValueAtTime(3 + Math.random() * 2, ctx.currentTime)

      const volume = 0.12 + Math.random() * 0.1
      gainNode.gain.setValueAtTime(volume, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + cheerDuration)

      source.buffer = buffer
      source.connect(filterNode)
      filterNode.connect(gainNode)
      gainNode.connect(ctx.destination)

      source.start(ctx.currentTime)
      source.stop(ctx.currentTime + cheerDuration)
    }, delay * 1000)
  }
}
