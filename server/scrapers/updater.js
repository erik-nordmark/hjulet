import { promises as fs } from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Updates the game-providers.js file with newly scraped game data
 * Merges scraped data with existing data (keeps old games, adds new ones)
 */
export const updateGameProvidersFile = async (scrapedData) => {
  const filePath = path.join(__dirname, "../data/game-providers.js")

  try {
    // Read the current file
    const currentContent = await fs.readFile(filePath, "utf8")

    // Import the current data to merge with scraped data
    const { SLOT_GAMES_BY_PROVIDER } = await import("../data/game-providers.js")

    // Merge the data: keep existing games and add new ones
    const updatedProviders = { ...SLOT_GAMES_BY_PROVIDER }

    for (const [providerId, newGames] of Object.entries(scrapedData)) {
      if (providerId in updatedProviders) {
        // Merge with existing games, removing duplicates
        const existingGames = new Set(
          updatedProviders[providerId].map((g) => g.toLowerCase().trim()),
        )
        const mergedGames = [...updatedProviders[providerId]]

        for (const newGame of newGames) {
          if (!existingGames.has(newGame.toLowerCase().trim())) {
            mergedGames.push(newGame)
          }
        }

        updatedProviders[providerId] = mergedGames.sort()
      } else {
        // New provider, just add it
        updatedProviders[providerId] = newGames.sort()
      }
    }

    // Generate the new file content
    const newContent = generateGameProvidersFile(updatedProviders)

    // Create backup of old file
    const backupPath = path.join(__dirname, "../data/game-providers.backup.js")
    await fs.writeFile(backupPath, currentContent, "utf8")

    // Write the new content
    await fs.writeFile(filePath, newContent, "utf8")

    // Calculate statistics
    const stats = {}
    for (const [providerId, games] of Object.entries(updatedProviders)) {
      const oldCount = SLOT_GAMES_BY_PROVIDER[providerId]?.length || 0
      const newCount = games.length
      stats[providerId] = {
        oldCount,
        newCount,
        added: newCount - oldCount,
      }
    }

    return {
      success: true,
      stats,
      backupPath,
    }
  } catch (error) {
    console.error("Failed to update game providers file:", error)
    return {
      success: false,
      error: error.message,
    }
  }
}

/**
 * Generates the content for the game-providers.js file
 */
function generateGameProvidersFile(providersData) {
  const providerNames = {
    netent: "NetEnt",
    hacksaw: "Hacksaw Gaming",
    playngo: "Play'n GO",
    pragmatic: "Pragmatic Play",
    nolimit: "Nolimit City",
    push: "Push Gaming",
    elk: "ELK Studios",
    lightwonder: "Light & Wonder",
  }

  let content = `export const SLOT_PROVIDERS = ${JSON.stringify(providerNames, null, 2)}\n\n`

  content += `export const SLOT_GAMES_BY_PROVIDER = {\n`

  const providerEntries = Object.entries(providersData).sort(([a], [b]) => a.localeCompare(b))

  for (let i = 0; i < providerEntries.length; i++) {
    const [providerId, games] = providerEntries[i]
    const isLast = i === providerEntries.length - 1

    content += `  ${providerId}: [\n`
    for (let j = 0; j < games.length; j++) {
      const game = games[j]
      // Escape single quotes and backslashes, remove any newlines or control characters
      const cleanGame = game
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/\r?\n/g, " ")
        .replace(/\t/g, " ")
        .trim()
      const comma = j < games.length - 1 ? "," : ""
      content += `    '${cleanGame}'${comma}\n`
    }
    content += `  ]${isLast ? "" : ","}\n`
  }

  content += `}\n\n`

  content += `export const SLOT_GAMES = Object.entries(SLOT_GAMES_BY_PROVIDER).flatMap(
  ([providerId, games]) =>
    games.map((name) => ({
      providerId,
      provider: SLOT_PROVIDERS[providerId],
      name,
    })),
)\n\n`

  content += `// Build a map from game name (lowercase) to provider ID for quick lookup
export const buildGameProviderMap = () => {
  const map = {}
  for (const [providerId, games] of Object.entries(SLOT_GAMES_BY_PROVIDER)) {
    for (const game of games) {
      map[game.toLowerCase().trim()] = providerId
    }
  }
  return map
}
`

  return content
}
