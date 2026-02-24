export const UNDECIDED_SLOTS = [
  "Jolly Roger",
  "Aztec Idols",
  "Pearl Lagoon",
  "Dragon Ship",
  "Myth",
  "Photo Safari",
  "Lucky Diamonds",
  "Fruit Bonanza",
  "Wild Blood",
  "Ninja Fruits",
  "Troll Hunters",
  "Riches of Ra",
  "Pearls of India",
  "Golden Ticket",
  "Pimped",
  "Superflip",
  "Golden Caravan",
  "Hugo",
  "7 Sins",
  "Viking Runecraft",
] as const

export type UndecidedSlotName = (typeof UNDECIDED_SLOTS)[number]
