# Game Scraper

This module automatically fetches the latest game lists from slot provider websites.

## How It Works

The scraper fetches game lists from:

- **Pragmatic Play** - https://www.pragmaticplay.com/en/games/
- **Play'n GO** - https://www.playngo.com/games/slots/
- **NetEnt** - https://www.netent.com/en/games/
- **Push Gaming** - https://www.pushgaming.com/games/
- **Nolimit City** - https://nolimitcity.com/games/
- **Hacksaw Gaming** - https://www.hacksawgaming.com/games
- **ELK Studios** - https://www.elk-studios.com/games/

## Usage

### Via Admin UI

1. Open the admin page at `/admin`
2. Click the "🔄 Uppdatera spellista" button in the game search section
3. Wait for the scraping to complete (may take 30-60 seconds)
4. Review the results showing how many games were added
5. Reload the page to see the updated game list

### Via API

Send a POST request to `/admin/scrape-games`:

```bash
curl -X POST http://localhost:5174/admin/scrape-games
```

Response:

```json
{
  "success": true,
  "message": "Successfully scraped and updated game providers",
  "scrapeStats": {
    "successCount": 7,
    "failCount": 0,
    "totalProviders": 7
  },
  "updateStats": {
    "pragmatic": { "oldCount": 44, "newCount": 46, "added": 2 },
    "playngo": { "oldCount": 48, "newCount": 50, "added": 2 }
  },
  "backupPath": "/path/to/game-providers.backup.js"
}
```

## Data Merging

- The scraper **merges** new games with existing ones (additive only)
- Duplicate games are automatically filtered out
- A backup of the old file is created at `game-providers.backup.js`
- Case-insensitive matching prevents duplicate entries

## Notes

- Web scraping relies on the structure of provider websites, which may change
- Some providers may block scraping or rate-limit requests
- The scrapers use basic HTML parsing with cheerio
- If a provider's scraper fails, the others will continue
- After scraping, you'll need to reload the frontend to see new games

## Extending

To add a new provider:

1. Add a scraper function in `server/scrapers/index.js`:

```javascript
export const scrapeNewProvider = async () => {
  const response = await fetch("https://provider.com/games")
  const html = await response.text()
  const $ = cheerio.load(html)
  const games = new Set()

  // Add scraping logic here

  return Array.from(games).sort()
}
```

2. Add it to `scrapeAllProviders()` Promise.allSettled array
3. Add the provider ID to `SLOT_PROVIDERS` in `data/game-providers.js`
