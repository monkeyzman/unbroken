/** Original cast for Unbroken: Aster City. No licensed heroes. */

export const STATS = [
  { id: "pwr", label: "PWR", name: "Power" },
  { id: "spd", label: "SPD", name: "Speed" },
  { id: "smt", label: "SMT", name: "Smarts" },
  { id: "def", label: "DEF", name: "Defense" },
  { id: "tmw", label: "TMW", name: "Teamwork" },
];

export const STAT_NAME = Object.fromEntries(STATS.map((s) => [s.id, s.name]));

export const FACTIONS = {
  solar: {
    id: "solar",
    name: "Solar Vanguard",
    short: "Solar",
    motto: "Hold the noon.",
    stat: "def",
    synergy: "Noon Oath",
    color: "#ffb703",
    deep: "#c45c00",
    ink: "#5c2e00",
  },
  night: {
    id: "night",
    name: "Night Circuit",
    short: "Night",
    motto: "The city blinks. We don't.",
    stat: "spd",
    synergy: "Blackout Grid",
    color: "#c9a6ff",
    deep: "#6d4bd8",
    ink: "#2a1460",
  },
  chrome: {
    id: "chrome",
    name: "Chrome Collegium",
    short: "Chrome",
    motto: "Out-think the disaster.",
    stat: "smt",
    synergy: "Proof Protocol",
    color: "#7ef0ff",
    deep: "#149aab",
    ink: "#04343a",
  },
  wild: {
    id: "wild",
    name: "Wildheart Pact",
    short: "Wild",
    motto: "The old blood still bites.",
    stat: "pwr",
    synergy: "Pack Howl",
    color: "#9be36a",
    deep: "#3e8f22",
    ink: "#17330c",
  },
  void: {
    id: "void",
    name: "Velvet Void",
    short: "Void",
    motto: "Sing the hole in the sky.",
    stat: "tmw",
    synergy: "Chorus Link",
    color: "#ff8ad4",
    deep: "#d63a96",
    ink: "#4a0d38",
  },
};

export const ROLES = [
  {
    id: "tank",
    name: "Tank",
    emoji: "🛡️",
    blurb: "Holds the line. A thick Defense can body-block a hunt.",
  },
  {
    id: "speed",
    name: "Speedster",
    emoji: "⚡",
    blurb: "Moves first. Speed opens fights and sometimes slips a grab.",
  },
  {
    id: "brawl",
    name: "Brawler",
    emoji: "👊",
    blurb: "Breaks the fight open. Power ends things before they get weird.",
  },
  {
    id: "tech",
    name: "Tech / Genius",
    emoji: "🧠",
    blurb: "Cracks shields and can reboot a silenced squad.",
  },
  {
    id: "wild",
    name: "Wildcard",
    emoji: "🃏",
    blurb: "The glue. Teamwork steadies luck and cheats a few finales.",
  },
];

export const ROLE_STAT = {
  tank: "def",
  speed: "spd",
  brawl: "pwr",
  tech: "smt",
  wild: "tmw",
};

export const RARITY_LABEL = {
  common: "Common",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};

function hero(id, name, epithet, faction, role, rarity, stats, emoji, form, mask) {
  const [pwr, spd, smt, def, tmw] = stats;
  return {
    id,
    name,
    epithet,
    faction,
    role,
    rarity,
    stats: { pwr, spd, smt, def, tmw },
    emoji,
    form,
    mask,
  };
}

export const HEROES = [
  hero("helio", "Helio Bulwark", "The Noon Wall", "solar", "tank", "legendary", [76, 44, 56, 99, 90], "☀️", "person", "helm"),
  hero("theorem", "Theorem Aegis", "Unbroken Proof", "chrome", "tank", "legendary", [58, 48, 80, 97, 78], "🔷", "person", "visor"),
  hero("umber", "Umber Vault", "The Door That Stays", "night", "tank", "epic", [64, 66, 46, 91, 62], "🚪", "person", "helm"),
  hero("moss", "Moss Colossus", "Hill That Stood Up", "wild", "tank", "epic", [88, 36, 42, 93, 70], "🗿", "construct", "helm"),
  hero("solace", "Dame Solace", "Shield of the Late Sun", "solar", "tank", "rare", [54, 40, 52, 82, 70], "🌤️", "person", "halo"),
  hero("blackout", "Miss Blackout", "Holds the Dark Open", "night", "tank", "rare", [46, 70, 48, 78, 58], "🌑", "person", "hood"),
  hero("chorus", "Chorus Bell", "We Ring Together", "void", "tank", "rare", [42, 38, 50, 76, 92], "🔔", "construct", "halo"),
  hero("bracken", "Bracken Maw", "Rooted Jaw", "wild", "tank", "common", [66, 34, 30, 74, 48], "🦷", "beast", "torn"),
  hero("pylon", "Pylon Gregg", "Stands Where the Cable Ends", "chrome", "tank", "common", [40, 36, 60, 72, 50], "🗼", "construct", "visor"),

  hero("lumen", "Lumen Dash", "Always First Light", "solar", "speed", "legendary", [84, 99, 58, 44, 78], "💨", "person", "visor"),
  hero("zip", "Zip Null", "Arrives Before the Thought", "void", "speed", "legendary", [64, 98, 68, 38, 96], "🌀", "specter", "none"),
  hero("neon", "Neon Filcher", "Borrowed Blink", "night", "speed", "epic", [74, 94, 52, 40, 72], "💜", "person", "domino"),
  hero("quill", "Quill Velocity", "The Fast Citation", "chrome", "speed", "epic", [54, 92, 76, 40, 70], "✒️", "person", "visor"),
  hero("sunskip", "Sunskip Jet", "Never in Shadow", "solar", "speed", "rare", [66, 86, 44, 40, 60], "🌤️", "person", "grin"),
  hero("hare", "Bramble Hare", "Kicks, Then Vanishes", "wild", "speed", "rare", [78, 88, 32, 42, 58], "🐇", "beast", "tall"),
  hero("static", "Static Page", "Turns the Corner Twice", "night", "speed", "rare", [58, 84, 50, 34, 68], "📄", "person", "hood"),
  hero("ping", "Courier Ping", "You Have 4 Messages", "chrome", "speed", "common", [44, 78, 56, 32, 48], "📨", "person", "band"),
  hero("dust", "Dust Lottery", "Probably Here", "void", "speed", "common", [48, 76, 40, 30, 64], "✨", "specter", "none"),

  hero("brand", "Brand Knuckle", "Heat in the Hand", "solar", "brawl", "legendary", [99, 62, 48, 68, 84], "🔥", "person", "half"),
  hero("mastiff", "Red Mastiff", "Leans All the Way In", "wild", "brawl", "legendary", [99, 58, 42, 76, 86], "🐶", "beast", "torn"),
  hero("psalm", "Alley Psalm", "A Hymn With Brass Knuckles", "night", "brawl", "epic", [94, 70, 48, 54, 66], "🎤", "person", "grin"),
  hero("rivet", "Rivet Sermon", "Impact, Then a Footnote", "chrome", "brawl", "epic", [92, 48, 72, 58, 64], "🔩", "person", "helm"),
  hero("ida", "Ida Solhammer", "Noon Has Weight", "solar", "brawl", "rare", [86, 42, 38, 66, 62], "🔨", "person", "helm"),
  hero("gent", "Glass Jaw Gentleman", "Apologizes in Ink", "night", "brawl", "rare", [90, 64, 46, 34, 64], "🎩", "person", "domino"),
  hero("petal", "Petal Maul", "Soft Voice, Hard Finish", "wild", "brawl", "rare", [84, 54, 34, 60, 66], "🌺", "person", "hood"),
  hero("socket", "Socket Uppercut", "Grounded, Then Not", "chrome", "brawl", "common", [76, 42, 54, 46, 40], "🔌", "person", "visor"),
  hero("velvet", "Velvet Haymaker", "Polite About It", "void", "brawl", "common", [74, 48, 40, 42, 56], "🥊", "person", "grin"),

  hero("meridian", "Meridian Coil", "Dawn, Calculated", "chrome", "tech", "legendary", [52, 64, 99, 56, 90], "🧭", "person", "visor"),
  hero("sister", "Sister Margin", "Edits the Ending", "void", "tech", "legendary", [52, 60, 99, 52, 98], "📖", "person", "halo"),
  hero("auditor", "Night Auditor", "Counts the Exits", "night", "tech", "epic", [48, 76, 94, 44, 72], "🧮", "person", "domino"),
  hero("sapmath", "Dr. Sapmath", "Biology, With Opinions", "wild", "tech", "epic", [64, 44, 94, 56, 74], "🌿", "person", "grin"),
  hero("gnomon", "Gnomon Tess", "Measures the Long Shadow", "solar", "tech", "rare", [42, 48, 84, 50, 74], "📐", "person", "helm"),
  hero("faraday", "Faraday Mint", "Change for a Theory", "chrome", "tech", "rare", [40, 52, 86, 46, 70], "🪙", "person", "visor"),
  hero("finch", "Footfall Finch", "Your Footsteps, Itemized", "night", "tech", "rare", [38, 66, 82, 40, 70], "🐦", "person", "hood"),
  hero("root", "Root Calculator", "Counts on His Fingers, Wins", "wild", "tech", "common", [52, 34, 74, 46, 48], "🪵", "person", "band"),
  hero("antenna", "Humble Antenna", "Sorry, Was That Important?", "void", "tech", "common", [36, 44, 72, 38, 68], "📡", "construct", "visor"),

  hero("fox", "Aureate Fox", "Lucky Noon", "solar", "wild", "legendary", [72, 70, 64, 60, 99], "🦊", "person", "grin"),
  hero("unvoted", "The Unvoted", "Wins Rooms She's Not In", "void", "wild", "legendary", [66, 68, 70, 58, 99], "🎭", "person", "halo"),
  hero("jackal", "Jackal Radio", "Broadcasts the Ambush", "night", "wild", "epic", [64, 80, 56, 44, 90], "📻", "beast", "tall"),
  hero("picnic", "Picnic General", "Brought Snacks and a Plan", "wild", "wild", "epic", [80, 46, 52, 64, 90], "🧺", "person", "grin"),
  hero("comet", "Spare Comet", "Understudy to the Sun", "solar", "wild", "rare", [58, 68, 46, 50, 76], "☄️", "person", "visor"),
  hero("glitch", "Glitch Saint", "Blessed Are the Error Codes", "chrome", "wild", "rare", [44, 58, 74, 42, 80], "💾", "person", "visor"),
  hero("marie", "Maybe Marie", "Statistically Present", "void", "wild", "rare", [50, 54, 58, 48, 88], "🎲", "specter", "none"),
  hero("knot", "Knot Boy", "Ties the Whole Mess Together", "wild", "wild", "common", [64, 38, 36, 52, 70], "🪢", "person", "band"),
  hero("owl", "Overtime Owl", "Still Here After the Bell", "night", "wild", "common", [40, 64, 46, 38, 70], "🦉", "beast", "round"),
];

export const HERO_BY_ID = Object.fromEntries(HEROES.map((h) => [h.id, h]));

export function totalOf(stats) {
  return stats.pwr + stats.spd + stats.smt + stats.def + stats.tmw;
}

export function heroTotal(hero) {
  return totalOf(hero.stats);
}
