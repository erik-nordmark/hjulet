import express from "express"
import cors from "cors"
import { promises as fs } from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { randomUUID } from "crypto"
import { networkInterfaces } from "os"
import { SLOT_PROVIDERS, buildGameProviderMap } from "./data/game-providers.js"
import { scrapeAllProviders } from "./scrapers/index.js"
import { updateGameProvidersFile } from "./scrapers/updater.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DATA_DIR = path.join(__dirname, "data")
const DATA_FILE = path.join(DATA_DIR, "state.json")

const DEVICE_LIMIT = 1

// Map of game names to provider IDs for quick lookup
let GAME_TO_PROVIDER = {}

const initializeGameProviderMap = () => {
  GAME_TO_PROVIDER = buildGameProviderMap()
  console.log(
    `Loaded ${Object.keys(GAME_TO_PROVIDER).length} games across ${
      Object.keys(SLOT_PROVIDERS).length
    } providers`,
  )
}

const getProviderForGame = (gameName) => {
  const normalized = gameName.toLowerCase().trim()
  const providerId = GAME_TO_PROVIDER[normalized]
  return providerId ? SLOT_PROVIDERS[providerId] : "Unknown"
}

const getNetworkAddress = () => {
  const nets = networkInterfaces()
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip internal and non-IPv4 addresses
      if (net.family === "IPv4" && !net.internal) {
        return net.address
      }
    }
  }
  return "localhost"
}

const DEFAULT_STATE = {
  games: [],
  isLocked: false,
  submissionsByDevice: {},
  users: [],
  history: [],
  spinCount: 0,
  lastBonusAt: 0,
}

let state = JSON.parse(JSON.stringify(DEFAULT_STATE))
const clients = new Map()

const ensureDataFile = async () => {
  await fs.mkdir(DATA_DIR, { recursive: true })
  try {
    await fs.access(DATA_FILE)
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify(DEFAULT_STATE, null, 2), "utf8")
  }
}

const sanitizeUser = (user) => {
  const deviceIds = Array.isArray(user?.deviceIds)
    ? user.deviceIds.filter((id) => typeof id === "string" && id.trim() !== "")
    : []

  const rounds = Array.isArray(user?.rounds)
    ? user.rounds
        .filter((round) => round && typeof round === "object")
        .map((round) => ({
          id: round.id || randomUUID(),
          gameId: round.gameId || "",
          gameName: round.gameName || "",
          provider: round.provider || getProviderForGame(round.gameName || ""),
          userId: round.userId || "",
          userName: round.userName || "",
          before: Number(round.before) || 0,
          after: Number(round.after) || 0,
          delta: Number(round.delta) || 0,
          createdAt: round.createdAt || new Date().toISOString(),
        }))
    : []

  return {
    id: user?.id || randomUUID(),
    name: typeof user?.name === "string" && user.name.trim() !== "" ? user.name.trim() : "Spelare",
    deviceIds,
    totalProfit: Number(user?.totalProfit) || 0,
    rounds,
  }
}

const sanitizeGame = (game) => ({
  id: game?.id || randomUUID(),
  name: typeof game?.name === "string" ? game.name.trim() : "Okänt spel",
  provider:
    typeof game?.provider === "string" ? game.provider : getProviderForGame(game?.name || ""),
  createdAt: game?.createdAt || new Date().toISOString(),
  deviceId: typeof game?.deviceId === "string" ? game.deviceId : "",
  userId: typeof game?.userId === "string" ? game.userId : "",
})

const loadState = async () => {
  await ensureDataFile()
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8")
    const parsed = JSON.parse(raw)

    const games = Array.isArray(parsed?.games)
      ? parsed.games.filter((item) => item && typeof item === "object").map(sanitizeGame)
      : []

    const isLocked = typeof parsed?.isLocked === "boolean" ? parsed.isLocked : false

    const submissionsByDevice =
      parsed?.submissionsByDevice && typeof parsed.submissionsByDevice === "object"
        ? parsed.submissionsByDevice
        : {}

    const users = Array.isArray(parsed?.users)
      ? parsed.users.filter((item) => item && typeof item === "object").map(sanitizeUser)
      : []

    const history = Array.isArray(parsed?.history)
      ? parsed.history.filter((item) => item && typeof item === "object")
      : []

    const spinCount = typeof parsed?.spinCount === "number" ? parsed.spinCount : 0
    const lastBonusAt = typeof parsed?.lastBonusAt === "number" ? parsed.lastBonusAt : 0

    state = {
      games,
      isLocked,
      submissionsByDevice,
      users,
      history,
      spinCount,
      lastBonusAt,
    }
  } catch (error) {
    console.error("Failed to load state from storage. Using defaults.", error)
    state = JSON.parse(JSON.stringify(DEFAULT_STATE))
  }
}

const saveState = async () => {
  await fs.writeFile(DATA_FILE, JSON.stringify(state, null, 2), "utf8")
}

const migrateOldDataWithProviders = () => {
  let changed = false

  // Update history records without provider
  for (const record of state.history) {
    if (!record.provider) {
      record.provider = getProviderForGame(record.gameName)
      changed = true
    }
  }

  // Update user rounds without provider
  for (const user of state.users) {
    for (const round of user.rounds) {
      if (!round.provider) {
        round.provider = getProviderForGame(round.gameName)
        changed = true
      }
    }
  }

  // Update current games without provider
  for (const game of state.games) {
    if (!game.provider) {
      game.provider = getProviderForGame(game.name)
      changed = true
    }
  }

  if (changed) {
    console.log("Migrated old data with provider information")
    saveState().catch((err) => console.error("Failed to save migrated state:", err))
  }
}

const getLeaderboard = () => [...state.users].sort((a, b) => b.totalProfit - a.totalProfit)

const getProviderStats = () => {
  const stats = {}

  // Initialize stats for all known providers
  for (const provider of Object.values(SLOT_PROVIDERS)) {
    stats[provider] = {
      provider,
      totalProfit: 0,
      gamesPlayed: 0,
      biggestWin: 0,
      biggestLoss: 0,
    }
  }

  // Add Unknown provider
  stats["Unknown"] = {
    provider: "Unknown",
    totalProfit: 0,
    gamesPlayed: 0,
    biggestWin: 0,
    biggestLoss: 0,
  }

  // Calculate stats from history
  for (const record of state.history) {
    const provider = record.provider || getProviderForGame(record.gameName)

    if (!stats[provider]) {
      stats[provider] = {
        provider,
        totalProfit: 0,
        gamesPlayed: 0,
        biggestWin: 0,
        biggestLoss: 0,
      }
    }

    stats[provider].totalProfit += record.delta
    stats[provider].gamesPlayed += 1

    if (record.delta > stats[provider].biggestWin) {
      stats[provider].biggestWin = record.delta
    }
    if (record.delta < stats[provider].biggestLoss) {
      stats[provider].biggestLoss = record.delta
    }
  }

  // Convert to array and sort by total profit (descending)
  return Object.values(stats)
    .filter((stat) => stat.gamesPlayed > 0)
    .sort((a, b) => b.totalProfit - a.totalProfit)
}

const getConnectedDevices = () => {
  const devices = []
  const seen = new Set()

  for (const client of clients.values()) {
    if (client.deviceId && !seen.has(client.deviceId)) {
      seen.add(client.deviceId)

      // Find user associated with this device
      const user = state.users.find((u) => u.deviceIds && u.deviceIds.includes(client.deviceId))

      devices.push({
        deviceId: client.deviceId,
        userName: user?.name || "Okänd",
        hasSubmitted: Boolean(state.submissionsByDevice[client.deviceId]),
      })
    }
  }

  return devices
}

const broadcast = (options = {}) => {
  const payload = `data: ${JSON.stringify({
    type: "sync",
    games: state.games,
    isLocked: state.isLocked,
    users: getLeaderboard(),
    providerStats: getProviderStats(),
    connectedDevices: getConnectedDevices(),
    deviceLimit: DEVICE_LIMIT,
    submittedDeviceIds: Object.keys(state.submissionsByDevice),
    ...options,
  })}\n\n`

  for (const client of clients.values()) {
    try {
      client.res.write(payload)
    } catch (error) {
      console.error("Failed to notify client", error)
    }
  }
}

const getDeviceId = (req) => {
  const headerId =
    typeof req.header("x-device-id") === "string" ? req.header("x-device-id").trim() : ""
  const queryId = typeof req.query.deviceId === "string" ? req.query.deviceId.trim() : ""
  return headerId || queryId
}

const createApp = () => {
  const app = express()

  app.use(cors())
  app.use(express.json())

  app.get("/games", (req, res) => {
    const deviceId = getDeviceId(req)
    const hasSubmitted = deviceId ? Boolean(state.submissionsByDevice[deviceId]) : false

    res.json({
      games: state.games,
      isLocked: state.isLocked,
      deviceLimit: DEVICE_LIMIT,
      hasSubmitted,
      users: getLeaderboard(),
      providerStats: getProviderStats(),
      connectedDevices: getConnectedDevices(),
    })
  })

  app.post("/users", async (req, res) => {
    try {
      const name = typeof req.body?.name === "string" ? req.body.name.trim() : ""
      const deviceId = typeof req.body?.deviceId === "string" ? req.body.deviceId.trim() : ""

      if (!name) {
        res.status(400).json({ error: "Name is required." })
        return
      }

      if (!deviceId) {
        res.status(400).json({ error: "deviceId is required." })
        return
      }

      let user = state.users.find((u) => u.deviceIds.includes(deviceId))

      if (!user) {
        user = {
          id: randomUUID(),
          name,
          deviceIds: [deviceId],
          totalProfit: 0,
          rounds: [],
        }
        state.users.push(user)
      } else {
        user.name = name
        if (!user.deviceIds.includes(deviceId)) {
          user.deviceIds.push(deviceId)
        }
      }

      await saveState()
      broadcast()

      res.json({ user, users: getLeaderboard() })
    } catch (error) {
      console.error("Failed to create user", error)
      res.status(500).json({ error: "Failed to create user." })
    }
  })

  app.get("/users", (_req, res) => {
    res.json({ users: getLeaderboard() })
  })

  app.post("/admin/users", async (req, res) => {
    try {
      const name = typeof req.body?.name === "string" ? req.body.name.trim() : ""

      if (!name) {
        res.status(400).json({ error: "Name is required." })
        return
      }

      const duplicate = state.users.some((user) => user.name.toLowerCase() === name.toLowerCase())
      if (duplicate) {
        res
          .status(409)
          .json({ error: "A user with that name already exists.", code: "duplicate-name" })
        return
      }

      const user = sanitizeUser({
        id: randomUUID(),
        name,
        deviceIds: [],
        totalProfit: 0,
        rounds: [],
      })

      state.users.push(user)

      await saveState()
      broadcast()

      res.status(201).json({ user, users: getLeaderboard() })
    } catch (error) {
      console.error("Failed to create admin user", error)
      res.status(500).json({ error: "Failed to create user." })
    }
  })

  app.post("/admin/games", async (req, res) => {
    try {
      const name = typeof req.body?.name === "string" ? req.body.name.trim() : ""
      const userId = typeof req.body?.userId === "string" ? req.body.userId.trim() : ""

      if (!name) {
        res.status(400).json({ error: "Game name is required." })
        return
      }

      if (!userId) {
        res.status(400).json({ error: "userId is required." })
        return
      }

      const user = state.users.find((u) => u.id === userId)
      if (!user) {
        res.status(404).json({ error: "User not found.", code: "user-not-found" })
        return
      }

      const duplicateName = state.games.some(
        (game) => game.name.toLowerCase() === name.toLowerCase(),
      )
      if (duplicateName) {
        res.status(409).json({ error: "Game already exists.", code: "duplicate-name" })
        return
      }

      const alreadyQueued = state.games.some((game) => game.userId === userId)
      if (alreadyQueued) {
        res.status(409).json({
          error: "User already has a game in this round.",
          code: "user-submission-exists",
        })
        return
      }

      const game = sanitizeGame({
        id: randomUUID(),
        name,
        deviceId: `admin:${userId}`,
        userId,
      })

      state.games.push(game)

      await saveState()
      broadcast()

      res.status(201).json({ game })
    } catch (error) {
      console.error("Failed to add game for user", error)
      res.status(500).json({ error: "Failed to add game." })
    }
  })

  app.post("/games", async (req, res) => {
    try {
      const name = typeof req.body?.name === "string" ? req.body.name.trim() : ""
      const deviceId = typeof req.body?.deviceId === "string" ? req.body.deviceId.trim() : ""
      const userId = typeof req.body?.userId === "string" ? req.body.userId.trim() : ""

      if (!name) {
        res.status(400).json({ error: "Game name is required." })
        return
      }
      if (!deviceId) {
        res.status(400).json({ error: "deviceId is required." })
        return
      }
      if (!userId) {
        res.status(400).json({ error: "userId is required." })
        return
      }

      const user = state.users.find((u) => u.id === userId)
      if (!user) {
        res.status(404).json({ error: "User not found." })
        return
      }

      if (!user.deviceIds.includes(deviceId)) {
        user.deviceIds.push(deviceId)
      }

      if (state.submissionsByDevice[deviceId]) {
        res.status(429).json({ error: "Den här enheten har redan lagt till ett spel." })
        return
      }

      const exists = state.games.some((game) => game.name.toLowerCase() === name.toLowerCase())
      if (exists) {
        res.status(409).json({ error: "Game already exists.", code: "duplicate-name" })
        return
      }

      const alreadyQueued = state.games.some((game) => game.userId === userId)
      if (alreadyQueued) {
        res.status(409).json({
          error: "User already has a game in this round.",
          code: "user-submission-exists",
        })
        return
      }

      const game = sanitizeGame({
        id: randomUUID(),
        name,
        deviceId,
        userId,
      })

      state.games.push(game)
      state.submissionsByDevice[deviceId] = game.id
      await saveState()
      broadcast()

      res.status(201).json({ game })
    } catch (error) {
      console.error("Failed to add game", error)
      res.status(500).json({ error: "Failed to add game." })
    }
  })

  app.post("/results", async (req, res) => {
    try {
      const gameId = typeof req.body?.gameId === "string" ? req.body.gameId.trim() : ""
      const before = Number(req.body?.before)
      const after = Number(req.body?.after)

      if (!gameId) {
        res.status(400).json({ error: "gameId is required." })
        return
      }
      if (!Number.isFinite(before) || !Number.isFinite(after)) {
        res.status(400).json({ error: "before and after must be numbers." })
        return
      }

      const game = state.games.find((g) => g.id === gameId)
      if (!game) {
        res.status(404).json({ error: "Game not found." })
        return
      }

      const user = state.users.find((u) => u.id === game.userId)
      if (!user) {
        res.status(404).json({ error: "User not found for game." })
        return
      }

      const delta = after - before
      const record = {
        id: randomUUID(),
        gameId: game.id,
        gameName: game.name,
        provider: game.provider || getProviderForGame(game.name),
        userId: user.id,
        userName: user.name,
        before,
        after,
        delta,
        createdAt: new Date().toISOString(),
      }

      user.totalProfit = (Number(user.totalProfit) || 0) + delta
      user.rounds = [...user.rounds, record]
      state.history.push(record)

      state.games = []
      state.submissionsByDevice = {}

      await saveState()
      broadcast()

      res.json({ result: record, users: getLeaderboard() })
    } catch (error) {
      console.error("Failed to record result", error)
      res.status(500).json({ error: "Failed to record result." })
    }
  })

  app.post("/games/clear", async (_req, res) => {
    try {
      state.games = []
      state.submissionsByDevice = {}
      await saveState()
      broadcast()
      res.status(204).end()
    } catch (error) {
      console.error("Failed to clear games", error)
      res.status(500).json({ error: "Failed to clear games." })
    }
  })

  app.delete("/games/:id", async (req, res) => {
    try {
      const { id } = req.params
      const index = state.games.findIndex((game) => game.id === id)

      if (index === -1) {
        res.status(404).json({ error: "Game not found." })
        return
      }

      const game = state.games[index]

      state.games.splice(index, 1)
      for (const [deviceId, gameId] of Object.entries(state.submissionsByDevice)) {
        if (gameId === id) {
          delete state.submissionsByDevice[deviceId]
        }
      }

      await saveState()
      broadcast()

      res.status(204).end()
    } catch (error) {
      console.error("Failed to remove game", error)
      res.status(500).json({ error: "Failed to remove game." })
    }
  })

  app.post("/spin", async (req, res) => {
    try {
      const locked = req.body?.locked
      if (typeof locked !== "boolean") {
        res.status(400).json({ error: "locked flag is required." })
        return
      }

      state.isLocked = locked

      // Increment spin counter when locking
      if (locked) {
        state.spinCount += 1
      }

      await saveState()
      broadcast()

      res.json({ isLocked: state.isLocked, spinCount: state.spinCount })
    } catch (error) {
      console.error("Failed to update spin state", error)
      res.status(500).json({ error: "Failed to update spin state." })
    }
  })

  app.get("/bonus/check", (_req, res) => {
    try {
      const spinsSinceBonus = state.spinCount - state.lastBonusAt
      const minSpins = 5
      const targetSpins = 15
      const maxSpins = 20

      // Bonus starts with small chance at spin 5, ~15% total by spin 10, guaranteed at spin 20
      let shouldTrigger = false
      if (spinsSinceBonus >= minSpins) {
        if (spinsSinceBonus >= maxSpins) {
          shouldTrigger = true
        } else {
          // Exponential curve: starts at ~1.5% at spin 5, reaches ~15% at spin 10, 100% at spin 20
          const t = (spinsSinceBonus - minSpins) / (maxSpins - minSpins)
          const probability = Math.pow(t, 1.8) // Exponential curve for gradual increase
          shouldTrigger = Math.random() < probability
        }
      }

      res.json({
        shouldTrigger,
        spinsSinceBonus,
        totalSpins: state.spinCount,
      })
    } catch (error) {
      console.error("Failed to check bonus", error)
      res.status(500).json({ error: "Failed to check bonus." })
    }
  })

  app.post("/bonus/spin", async (req, res) => {
    try {
      // Weighted random selection: 200 (35%), 400 (35%), 600 (20%), 800 (10%)
      const rand = Math.random() * 100
      let amount

      if (rand < 35) {
        amount = 200
      } else if (rand < 70) {
        amount = 400
      } else if (rand < 90) {
        amount = 600
      } else {
        amount = 800
      }

      state.lastBonusAt = state.spinCount
      await saveState()
      broadcast()

      res.json({ amount })
    } catch (error) {
      console.error("Failed to spin bonus", error)
      res.status(500).json({ error: "Failed to spin bonus." })
    }
  })

  app.get("/history", (_req, res) => {
    res.json({ history: state.history })
  })

  app.post("/reset", async (_req, res) => {
    try {
      // Reset state to default
      state = JSON.parse(JSON.stringify(DEFAULT_STATE))

      // Save the reset state
      await saveState()

      // Notify all clients about the reset with reset flag
      broadcast({ reset: true })

      console.log("System reset completed")
      res.json({
        success: true,
        message: "System has been reset successfully",
      })
    } catch (error) {
      console.error("Failed to reset system", error)
      res.status(500).json({ error: "Failed to reset system." })
    }
  })

  app.post("/admin/scrape-games", async (_req, res) => {
    try {
      console.log("Starting game scraping process...")

      // Scrape all providers
      const scrapeResult = await scrapeAllProviders()

      if (!scrapeResult.success) {
        res.status(500).json({
          success: false,
          error: "Failed to scrape any providers",
          details: scrapeResult,
        })
        return
      }

      // Update the game providers file
      const updateResult = await updateGameProvidersFile(scrapeResult.data)

      if (!updateResult.success) {
        res.status(500).json({
          success: false,
          error: "Failed to update game providers file",
          details: updateResult.error,
        })
        return
      }

      // Reload the game provider map
      initializeGameProviderMap()

      res.json({
        success: true,
        message: "Successfully scraped and updated game providers",
        scrapeStats: {
          successCount: scrapeResult.successCount,
          failCount: scrapeResult.failCount,
          totalProviders: scrapeResult.totalProviders,
        },
        updateStats: updateResult.stats,
        backupPath: updateResult.backupPath,
      })
    } catch (error) {
      console.error("Failed to scrape games:", error)
      res.status(500).json({
        success: false,
        error: "Failed to scrape games",
        details: error.message,
      })
    }
  })

  app.get("/events", (req, res) => {
    const deviceId = getDeviceId(req)

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    })
    res.flushHeaders?.()

    const clientId = randomUUID()
    clients.set(clientId, { res, deviceId })
    console.log("SSE client connected", { clientId, deviceId })

    const heartbeat = setInterval(() => {
      res.write("event: ping\ndata: {}\n\n")
    }, 20000)

    res.write(
      `data: ${JSON.stringify({
        type: "sync",
        games: state.games,
        isLocked: state.isLocked,
        users: getLeaderboard(),
        providerStats: getProviderStats(),
        connectedDevices: getConnectedDevices(),
        deviceLimit: DEVICE_LIMIT,
        submittedDeviceIds: Object.keys(state.submissionsByDevice),
      })}\n\n`,
    )

    // Notify other clients about the new connection
    setTimeout(() => {
      broadcast()
    }, 100)

    req.on("close", () => {
      clearInterval(heartbeat)
      clients.delete(clientId)
      console.log("SSE client disconnected", { clientId, deviceId })
      // Broadcast updated device list when client disconnects
      broadcast()
    })
  })

  return app
}

const start = async () => {
  const port = Number(process.env.PORT) || 5174
  initializeGameProviderMap()
  await loadState()
  migrateOldDataWithProviders()

  const app = createApp()

  const networkAddr = getNetworkAddress()

  app.listen(port, "0.0.0.0", () => {
    console.log(`Game service listening on:`)
    console.log(`  Local:   http://localhost:${port}`)
    console.log(`  Network: http://${networkAddr}:${port}`)
  })
}

start().catch((error) => {
  console.error("Failed to start server", error)
  process.exit(1)
})
