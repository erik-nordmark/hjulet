import * as cheerio from "cheerio"

/**
 * Scraper for Pragmatic Play games
 * Scrapes from their official games page
 */
export const scrapePragmaticPlay = async () => {
  try {
    const response = await fetch("https://www.pragmaticplay.com/en/games/", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    })
    const html = await response.text()
    const $ = cheerio.load(html)

    const games = new Set()

    // Try to find game titles from their website structure
    $('[class*="game"]').each((_, elem) => {
      const title =
        $(elem).find('[class*="title"]').text().trim() ||
        $(elem).find("h3").text().trim() ||
        $(elem).attr("data-title")?.trim() ||
        $(elem).attr("alt")?.trim()

      if (title && title.length > 2) {
        games.add(title)
      }
    })

    console.log(`Scraped ${games.size} games from Pragmatic Play`)
    return Array.from(games).sort()
  } catch (error) {
    console.error("Failed to scrape Pragmatic Play:", error.message)
    return null
  }
}

/**
 * Scraper for Play'n GO games
 * Scrapes from their official games page
 */
export const scrapePlaynGo = async () => {
  try {
    const response = await fetch("https://www.playngo.com/games/slots/", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    })
    const html = await response.text()
    const $ = cheerio.load(html)

    const games = new Set()

    // Try to find game titles
    $('[class*="slot"], [class*="game"]').each((_, elem) => {
      const title =
        $(elem).find("h2, h3, h4, [class*=title]").text().trim() ||
        $(elem).attr("data-game-name")?.trim() ||
        $(elem).find("img").attr("alt")?.trim()

      if (title && title.length > 2 && !title.toLowerCase().includes("slots")) {
        games.add(title)
      }
    })

    console.log(`Scraped ${games.size} games from Play'n GO`)
    return Array.from(games).sort()
  } catch (error) {
    console.error("Failed to scrape Play'n GO:", error.message)
    return null
  }
}

/**
 * Scraper for NetEnt games
 */
export const scrapeNetEnt = async () => {
  try {
    const response = await fetch("https://www.netent.com/en/games/", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    })
    const html = await response.text()
    const $ = cheerio.load(html)

    const games = new Set()

    $('[class*="game"], [data-game]').each((_, elem) => {
      const title =
        $(elem).find("h1, h2, h3, [class*=title], [class*=name]").text().trim() ||
        $(elem).attr("data-game-name")?.trim() ||
        $(elem).find("img").attr("alt")?.trim()

      if (title && title.length > 2) {
        games.add(title)
      }
    })

    console.log(`Scraped ${games.size} games from NetEnt`)
    return Array.from(games).sort()
  } catch (error) {
    console.error("Failed to scrape NetEnt:", error.message)
    return null
  }
}

/**
 * Scraper for Push Gaming games
 */
export const scrapePushGaming = async () => {
  try {
    const response = await fetch("https://www.pushgaming.com/games/", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    })
    const html = await response.text()
    const $ = cheerio.load(html)

    const games = new Set()

    $('[class*="game"]').each((_, elem) => {
      const title =
        $(elem).find("h1, h2, h3, h4, [class*=title]").text().trim() ||
        $(elem).attr("data-title")?.trim() ||
        $(elem).find("img").attr("alt")?.trim()

      if (title && title.length > 2) {
        games.add(title)
      }
    })

    console.log(`Scraped ${games.size} games from Push Gaming`)
    return Array.from(games).sort()
  } catch (error) {
    console.error("Failed to scrape Push Gaming:", error.message)
    return null
  }
}

/**
 * Scraper for Nolimit City games
 */
export const scrapeNolimitCity = async () => {
  try {
    const response = await fetch("https://nolimitcity.com/games/", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    })
    const html = await response.text()
    const $ = cheerio.load(html)

    const games = new Set()

    $('[class*="game"], [class*="slot"]').each((_, elem) => {
      const title =
        $(elem).find("h1, h2, h3, [class*=title], [class*=name]").text().trim() ||
        $(elem).find("img").attr("alt")?.trim()

      if (title && title.length > 2) {
        games.add(title)
      }
    })

    console.log(`Scraped ${games.size} games from Nolimit City`)
    return Array.from(games).sort()
  } catch (error) {
    console.error("Failed to scrape Nolimit City:", error.message)
    return null
  }
}

/**
 * Scraper for Hacksaw Gaming games
 */
export const scrapeHacksawGaming = async () => {
  try {
    const response = await fetch("https://www.hacksawgaming.com/games", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    })
    const html = await response.text()
    const $ = cheerio.load(html)

    const games = new Set()

    $('[class*="game"]').each((_, elem) => {
      const title =
        $(elem).find("h1, h2, h3, h4, [class*=title]").text().trim() ||
        $(elem).find("img").attr("alt")?.trim()

      if (title && title.length > 2) {
        games.add(title)
      }
    })

    console.log(`Scraped ${games.size} games from Hacksaw Gaming`)
    return Array.from(games).sort()
  } catch (error) {
    console.error("Failed to scrape Hacksaw Gaming:", error.message)
    return null
  }
}

/**
 * Scraper for ELK Studios games
 */
export const scrapeELKStudios = async () => {
  try {
    const response = await fetch("https://www.elk-studios.com/games/", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    })
    const html = await response.text()
    const $ = cheerio.load(html)

    const games = new Set()

    $('[class*="game"]').each((_, elem) => {
      const title =
        $(elem).find("h1, h2, h3, [class*=title]").text().trim() ||
        $(elem).find("img").attr("alt")?.trim()

      if (title && title.length > 2) {
        games.add(title)
      }
    })

    console.log(`Scraped ${games.size} games from ELK Studios`)
    return Array.from(games).sort()
  } catch (error) {
    console.error("Failed to scrape ELK Studios:", error.message)
    return null
  }
}

/**
 * Master function to scrape all providers
 */
export const scrapeAllProviders = async () => {
  console.log("Starting to scrape game providers...")

  const results = await Promise.allSettled([
    scrapePragmaticPlay().then((games) => ({ provider: "pragmatic", games })),
    scrapePlaynGo().then((games) => ({ provider: "playngo", games })),
    scrapeNetEnt().then((games) => ({ provider: "netent", games })),
    scrapePushGaming().then((games) => ({ provider: "push", games })),
    scrapeNolimitCity().then((games) => ({ provider: "nolimit", games })),
    scrapeHacksawGaming().then((games) => ({ provider: "hacksaw", games })),
    scrapeELKStudios().then((games) => ({ provider: "elk", games })),
  ])

  const scrapedData = {}
  let successCount = 0
  let failCount = 0

  for (const result of results) {
    if (result.status === "fulfilled" && result.value.games && result.value.games.length > 0) {
      scrapedData[result.value.provider] = result.value.games
      successCount++
    } else {
      failCount++
    }
  }

  console.log(
    `Scraping complete: ${successCount} providers succeeded, ${failCount} providers failed`
  )

  return {
    success: successCount > 0,
    data: scrapedData,
    successCount,
    failCount,
    totalProviders: results.length,
  }
}
