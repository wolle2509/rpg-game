import { useState, useEffect, useCallback, useMemo, useRef } from "react";

// ============================================================
// CONSTANTS & DATA
// ============================================================

const WORLD_SIZE = 512;
const VIEW_SIZE = 15;
const TILE_PX = 40;
const INVENTORY_CAPACITY = 20; // max unique item stacks

const BIOME_COLORS = {
  ocean: "#3a6a8a", coast: "#6aaa8a", river: "#4a8aaa", lake: "#3a7a9a", swamp: "#6a7a4a",
  desert: "#c4a060", savanna: "#b0a050", grassland: "#7aaa55",
  forest: "#3a6a30", jungle: "#2a5828",
  tundra: "#8a9898", mountain: "#8a6a5a",
  volcanic: "#8a3828", glacier: "#b0c8d8",
};
const BIOME_EMOJI = {
  ocean: "🌊", coast: "🏖️", river: "💧", lake: "🏞️", swamp: "🪵",
  desert: "🏜️", savanna: "🦁", grassland: "🌿",
  forest: "🌲", jungle: "🌴",
  tundra: "❄️", mountain: "⛰️",
  volcanic: "🌋", glacier: "🧊",
};

// ============================================================
// CHUNK-BASED LEVEL SYSTEM (Replacing Distance-Based)
// ============================================================

const CHUNK_TIERS = [
  // 4x4 Raster - Row 1 (Top)
  { id: 1, levelRange: [16, 20], xMin: 40, xMax: 170, yMin: 35, yMax: 150, name: "Northern Kingdom" },
  { id: 2, levelRange: [21, 25], xMin: 170, xMax: 300, yMin: 35, yMax: 150, name: "High Crown" },
  { id: 3, levelRange: [26, 30], xMin: 300, xMax: 430, yMin: 35, yMax: 150, name: "Eastern Spire" },
  { id: 4, levelRange: [31, 35], xMin: 430, xMax: 512, yMin: 35, yMax: 150, name: "Sunken Realm" },
  
  // 4x4 Raster - Row 2 (Upper Middle)
  { id: 5, levelRange: [11, 15], xMin: 40, xMax: 170, yMin: 150, yMax: 280, name: "Western Vale" },
  { id: 6, levelRange: [6, 10], xMin: 170, xMax: 300, yMin: 150, yMax: 280, name: "Green Plains" },
  { id: 7, levelRange: [41, 45], xMin: 300, xMax: 430, yMin: 150, yMax: 280, name: "Crimson Wastes" },
  { id: 8, levelRange: [36, 40], xMin: 430, xMax: 512, yMin: 150, yMax: 280, name: "Scorched Land" },
  
  // 4x4 Raster - Row 3 (Lower Middle)
  { id: 9, isDynamic: true, xMin: 40, xMax: 170, yMin: 280, yMax: 410, name: "Mystic Sanctum" },
  { id: 10, levelRange: [1, 5], xMin: 170, xMax: 300, yMin: 280, yMax: 410, name: "Starter Plains" },
  { id: 11, isDynamic: true, xMin: 300, xMax: 430, yMin: 280, yMax: 410, name: "Twilight Forest" },
  { id: 12, levelRange: [46, 50], xMin: 430, xMax: 512, yMin: 280, yMax: 410, name: "Obsidian Peaks" },
  
  // 4x4 Raster - Row 4 (Bottom - all dynamic)
  { id: 13, isDynamic: true, xMin: 40, xMax: 170, yMin: 410, yMax: 512, name: "Void Sanctum" },
  { id: 14, isDynamic: true, xMin: 170, xMax: 300, yMin: 410, yMax: 512, name: "Soul Nexus" },
  { id: 15, isDynamic: true, xMin: 300, xMax: 430, yMin: 410, yMax: 512, name: "Eternal Abyss" },
  { id: 16, isDynamic: true, xMin: 430, xMax: 512, yMin: 410, yMax: 512, name: "Realm's End" },
];



const ENEMIES_BY_BIOME = {
  grassland: [
    { name: "Bramble Boar", sprite: "bramble_boar", hp: 18, atk: 4, loot: [{ name: "Hide", chance: 0.5 }, { name: "Tusk", chance: 0.3 }], xpRange: [20, 45], goldRange: [4, 14] },
    { name: "Leaf Goblin", sprite: "leaf_goblin", hp: 22, atk: 5, loot: [{ name: "Gold Coin", chance: 0.4 }, { name: "Herb", chance: 0.3 }], xpRange: [25, 55], goldRange: [6, 18] },
    { name: "Wasp Scout", sprite: "wasp_scout", hp: 20, atk: 6, loot: [{ name: "Stinger", chance: 0.5 }, { name: "Wing Dust", chance: 0.3 }], xpRange: [22, 48], goldRange: [5, 16] },
    { name: "Dusk Harpy", sprite: "dusk_harpy", hp: 25, atk: 7, loot: [{ name: "Wind Essence", chance: 0.4 }, { name: "Feather", chance: 0.5 }], xpRange: [28, 55], goldRange: [7, 18] },
    { name: "Moss Beetle", sprite: "moss_beetle", hp: 30, atk: 6, loot: [{ name: "Chitin Shell", chance: 0.5 }, { name: "Iron Nail", chance: 0.3 }], xpRange: [30, 60], goldRange: [8, 20] },
    { name: "Slime Snail", sprite: "slime_snail_forest", hp: 16, atk: 5, loot: [{ name: "Slime", chance: 0.5 }, { name: "Snail Shell", chance: 0.3 }], xpRange: [20, 40], goldRange: [4, 12] },
  ],
  forest: [
    { name: "Bog Treant", sprite: "bog_treant", hp: 40, atk: 6, loot: [{ name: "Enchanted Bark", chance: 0.4 }, { name: "Herb", chance: 0.5 }], xpRange: [35, 70], goldRange: [10, 25] },
    { name: "Forest Dryad", sprite: "forest_dryad", hp: 28, atk: 7, loot: [{ name: "Fairy Dust", chance: 0.4 }, { name: "Petal", chance: 0.5 }], xpRange: [30, 65], goldRange: [8, 22] },
    { name: "Mushroom Squirrels", sprite: "mushroom_squirrels", hp: 20, atk: 5, loot: [{ name: "Mushroom Cap", chance: 0.5 }, { name: "Acorn", chance: 0.4 }], xpRange: [22, 48], goldRange: [5, 16] },
    { name: "Orc Warchief", sprite: "orc_warchief", hp: 45, atk: 8, loot: [{ name: "Orc Tooth", chance: 0.5 }, { name: "Club", chance: 0.2 }], xpRange: [40, 80], goldRange: [12, 30] },
  ],
  jungle: [
    { name: "Twin Flytraps", sprite: "twin_flytraps", hp: 30, atk: 8, loot: [{ name: "Vine Sap", chance: 0.5 }, { name: "Venom Sac", chance: 0.4 }], xpRange: [35, 70], goldRange: [10, 25] },
    { name: "Man Eater", sprite: "man_eater", hp: 35, atk: 9, loot: [{ name: "Serpent Fang", chance: 0.5 }, { name: "Venom Sac", chance: 0.4 }], xpRange: [38, 75], goldRange: [12, 28] },
    { name: "Toadstool Shaman", sprite: "toadstool_shaman", hp: 32, atk: 7, loot: [{ name: "Spore Cloud", chance: 0.4 }, { name: "Tribal Mask", chance: 0.3 }], xpRange: [30, 65], goldRange: [10, 24] },
    { name: "Venom Snail", sprite: "venom_snail", hp: 22, atk: 6, loot: [{ name: "Poison Slime", chance: 0.5 }, { name: "Shell Fragment", chance: 0.3 }], xpRange: [25, 52], goldRange: [6, 18] },
  ],
  swamp: [
    { name: "Bog Frog", sprite: "bog_frog", hp: 18, atk: 4, loot: [{ name: "Frog Leg", chance: 0.6 }, { name: "Slime", chance: 0.4 }], xpRange: [18, 38], goldRange: [3, 10] },
    { name: "Goblin Warlock", sprite: "goblin_warlock", hp: 32, atk: 7, loot: [{ name: "Hex Charm", chance: 0.4 }, { name: "Herb", chance: 0.5 }], xpRange: [30, 65], goldRange: [8, 22] },
    { name: "Venom Snail", sprite: "venom_snail", hp: 25, atk: 5, loot: [{ name: "Poison Slime", chance: 0.5 }, { name: "Leech Blood", chance: 0.4 }], xpRange: [22, 48], goldRange: [5, 15] },
  ],
  mountain: [
    { name: "Rock Golem", sprite: "rock_golem", hp: 50, atk: 8, loot: [{ name: "Iron Ore", chance: 0.5 }, { name: "Gemstone", chance: 0.2 }], xpRange: [40, 80], goldRange: [12, 30] },
    { name: "Ember Drake", sprite: "ember_drake", hp: 60, atk: 12, loot: [{ name: "Drake Scale", chance: 0.6 }, { name: "Dragon Horn", chance: 0.2 }], xpRange: [55, 110], goldRange: [18, 40] },
    { name: "Brutal Ogre", sprite: "brutal_ogre", hp: 75, atk: 10, loot: [{ name: "Giant's Heart", chance: 0.3 }, { name: "Boulder Shard", chance: 0.5 }], xpRange: [60, 120], goldRange: [20, 45] },
    { name: "Ashen Roc", sprite: "ashen_roc", hp: 55, atk: 11, loot: [{ name: "Fire Feather", chance: 0.5 }, { name: "Talon", chance: 0.3 }], xpRange: [50, 100], goldRange: [16, 36] },
  ],
  desert: [
    { name: "Lava Scorpion", sprite: "lava_scorpion", hp: 22, atk: 6, loot: [{ name: "Scorpion Stinger", chance: 0.5 }, { name: "Venom Sac", chance: 0.3 }], xpRange: [22, 48], goldRange: [5, 15] },
    { name: "Cursed Mummy", sprite: "cursed_mummy", hp: 35, atk: 7, loot: [{ name: "Ancient Bandage", chance: 0.5 }, { name: "Gold Scarab", chance: 0.3 }], xpRange: [32, 68], goldRange: [10, 24] },
    { name: "Ghastly", sprite: "ghastly", hp: 30, atk: 9, loot: [{ name: "Wraith Dust", chance: 0.4 }, { name: "Cursed Ring", chance: 0.2 }], xpRange: [35, 70], goldRange: [12, 28] },
    { name: "Scarab Tank", sprite: "scarab_tank", hp: 45, atk: 8, loot: [{ name: "Scarab Shell", chance: 0.5 }, { name: "Desert Gem", chance: 0.2 }], xpRange: [40, 82], goldRange: [14, 30] },
  ],
  savanna: [
    { name: "Bramble Boar", sprite: "bramble_boar", hp: 20, atk: 5, loot: [{ name: "Tusk", chance: 0.5 }], xpRange: [20, 42], goldRange: [4, 14] },
    { name: "Dusk Harpy", sprite: "dusk_harpy", hp: 35, atk: 9, loot: [{ name: "Feather", chance: 0.6 }, { name: "Talon", chance: 0.3 }], xpRange: [38, 75], goldRange: [12, 28] },
    { name: "Moss Bear", sprite: "moss_bear", hp: 55, atk: 10, loot: [{ name: "Bear Pelt", chance: 0.5 }, { name: "Bear Claw", chance: 0.3 }], xpRange: [45, 90], goldRange: [14, 32] },
    { name: "Moth", sprite: "moth", hp: 28, atk: 7, loot: [{ name: "Wing Dust", chance: 0.5 }, { name: "Silk Thread", chance: 0.3 }], xpRange: [25, 55], goldRange: [7, 20] },
  ],
  tundra: [
    { name: "Ice Ogre", sprite: "ice_ogre", hp: 50, atk: 9, loot: [{ name: "Ice Fang", chance: 0.5 }, { name: "Frost Pelt", chance: 0.3 }], xpRange: [42, 85], goldRange: [14, 30] },
    { name: "Moss Bear", sprite: "moss_bear", hp: 48, atk: 8, loot: [{ name: "Bear Pelt", chance: 0.5 }, { name: "Bear Claw", chance: 0.3 }], xpRange: [40, 80], goldRange: [12, 28] },
    { name: "Ghastly", sprite: "ghastly", hp: 35, atk: 10, loot: [{ name: "Dark Antler", chance: 0.4 }, { name: "Frozen Heart", chance: 0.2 }], xpRange: [38, 75], goldRange: [10, 26] },
    { name: "Brutal Ogre", sprite: "brutal_ogre", hp: 70, atk: 8, loot: [{ name: "Mammoth Tusk", chance: 0.4 }, { name: "Thick Hide", chance: 0.5 }], xpRange: [55, 110], goldRange: [18, 40] },
  ],
  volcanic: [
    { name: "Imp Cutlass", sprite: "imp_cutlass", hp: 25, atk: 8, loot: [{ name: "Ember", chance: 0.5 }, { name: "Ash", chance: 0.4 }], xpRange: [28, 58], goldRange: [8, 20] },
    { name: "Pyre Tortoise", sprite: "pyre_tortoise", hp: 60, atk: 12, loot: [{ name: "Obsidian Shard", chance: 0.5 }, { name: "Magma Core", chance: 0.2 }], xpRange: [55, 110], goldRange: [18, 40] },
    { name: "Lava Scorpion", sprite: "lava_scorpion", hp: 45, atk: 11, loot: [{ name: "Lava Shard", chance: 0.5 }, { name: "Infernal Blade", chance: 0.15 }], xpRange: [50, 100], goldRange: [16, 38] },
  ],
  glacier: [
    { name: "Ice Ogre", sprite: "ice_ogre", hp: 45, atk: 8, loot: [{ name: "Frost Crystal", chance: 0.5 }, { name: "Ancient Ice", chance: 0.3 }], xpRange: [38, 78], goldRange: [12, 28] },
    { name: "Ember Drake", sprite: "ember_drake", hp: 55, atk: 11, loot: [{ name: "Ice Scale", chance: 0.5 }, { name: "Frozen Fang", chance: 0.3 }], xpRange: [50, 100], goldRange: [16, 36] },
  ],
  river: [
    { name: "Sea Serpent", sprite: "sea_serpent", hp: 22, atk: 5, loot: [{ name: "Serpent Scale", chance: 0.5 }], xpRange: [22, 45], goldRange: [5, 14] },
    { name: "Scarab Tank", sprite: "scarab_tank", hp: 35, atk: 6, loot: [{ name: "Crab Shell", chance: 0.5 }, { name: "Crab Claw", chance: 0.3 }], xpRange: [28, 58], goldRange: [7, 20] },
    { name: "Bog Frog", sprite: "bog_frog", hp: 20, atk: 5, loot: [{ name: "Frog Leg", chance: 0.5 }, { name: "Pearl", chance: 0.2 }], xpRange: [20, 42], goldRange: [4, 14] },
  ],
  lake: [
    { name: "Eye Abomination", sprite: "eye_abomination", hp: 28, atk: 6, loot: [{ name: "Slime", chance: 0.5 }, { name: "Pearl", chance: 0.2 }], xpRange: [25, 52], goldRange: [6, 18] },
    { name: "Sea Serpent", sprite: "sea_serpent", hp: 40, atk: 9, loot: [{ name: "Abyssal Scale", chance: 0.4 }, { name: "Dark Pearl", chance: 0.2 }], xpRange: [38, 78], goldRange: [12, 28] },
  ],
  coast: [
    { name: "Scarab Tank", sprite: "scarab_tank", hp: 15, atk: 3, loot: [{ name: "Crab Shell", chance: 0.5 }], xpRange: [15, 30], goldRange: [3, 10] },
    { name: "Leaf Goblin", sprite: "leaf_goblin", hp: 30, atk: 7, loot: [{ name: "Gold Coin", chance: 0.5 }, { name: "Rum Bottle", chance: 0.3 }], xpRange: [30, 65], goldRange: [12, 28] },
  ],
};

// Fallback difficulty enemies
const ENEMIES_FALLBACK = {
  Beginner: [
    { name: "Leaf Goblin", sprite: "leaf_goblin", hp: 20, atk: 4, loot: [{ name: "Herb", chance: 0.3 }, { name: "Goblin Ear", chance: 0.5 }], xpRange: [25, 50], goldRange: [5, 15] },
    { name: "Slime Snail", sprite: "slime_snail_forest", hp: 15, atk: 3, loot: [{ name: "Slime", chance: 0.4 }], xpRange: [20, 40], goldRange: [3, 12] },
  ],
  Easy: [
    { name: "Orc Warchief", sprite: "orc_warchief", hp: 50, atk: 10, loot: [{ name: "Orc Tooth", chance: 0.5 }, { name: "Iron Ore", chance: 0.3 }], xpRange: [70, 120], goldRange: [18, 40] },
    { name: "Moss Beetle", sprite: "moss_beetle", hp: 45, atk: 9, loot: [{ name: "Chitin Shell", chance: 0.6 }, { name: "Gold Coin", chance: 0.4 }], xpRange: [60, 110], goldRange: [15, 35] },
  ],
  Intermediate: [
    { name: "Brutal Ogre", sprite: "brutal_ogre", hp: 100, atk: 19, loot: [{ name: "Dark Essence", chance: 0.5 }, { name: "Evil Amulet", chance: 0.2 }], xpRange: [160, 300], goldRange: [48, 95] },
  ],
  Hard: [
    { name: "Ember Drake", sprite: "ember_drake", hp: 200, atk: 35, loot: [{ name: "Dragon Scale", chance: 0.6 }, { name: "Infernal Blade", chance: 0.25 }], xpRange: [420, 800], goldRange: [110, 220] },
  ],
  Expert: [
    { name: "Eye Abomination", sprite: "eye_abomination", hp: 500, atk: 55, loot: [{ name: "Void Crystal", chance: 0.8 }, { name: "Reality Tear", chance: 0.25 }], xpRange: [900, 1800], goldRange: [250, 500] },
  ],
};

// ============================================================
// SPRITESHEET DATA
// ============================================================

const SPRITE_SCALE = 2000 / 2340; // actual image vs JSON coords
const SPRITE_CELL = Math.round(260 * SPRITE_SCALE);
const SPRITE_TILE = Math.round(256 * SPRITE_SCALE);
const SPRITE_PAD = Math.round(2 * SPRITE_SCALE);
const SPRITE_COLS = 9;

// Sprite key → pixel position in spritesheet { x, y, w, h }
const SPRITE_MAP = {
  "ember_drake": { x: 2, y: 2, w: 256, h: 256 },
  "man_eater": { x: 262, y: 2, w: 256, h: 256 },
  "orc_warchief": { x: 522, y: 2, w: 256, h: 256 },
  "dusk_harpy": { x: 782, y: 2, w: 256, h: 256 },
  "imp_cutlass": { x: 1042, y: 2, w: 256, h: 256 },
  "pyre_tortoise": { x: 1302, y: 2, w: 256, h: 256 },
  "venom_snail": { x: 1562, y: 2, w: 256, h: 256 },
  "ghastly": { x: 1822, y: 2, w: 256, h: 256 },
  "moth": { x: 2082, y: 2, w: 256, h: 256 },
  "bog_frog": { x: 2, y: 262, w: 256, h: 256 },
  "flame_knight": { x: 262, y: 262, w: 256, h: 256 },
  "bramble_boar": { x: 522, y: 262, w: 256, h: 256 },
  "brutal_ogre": { x: 782, y: 262, w: 256, h: 256 },
  "lava_scorpion": { x: 1042, y: 262, w: 256, h: 256 },
  "goblin_warlock": { x: 1302, y: 262, w: 256, h: 256 },
  "scarab_tank": { x: 1562, y: 262, w: 256, h: 256 },
  "ice_ogre": { x: 1822, y: 262, w: 256, h: 256 },
  "cursed_mummy": { x: 2082, y: 262, w: 256, h: 256 },
  "basilisk": { x: 2, y: 522, w: 256, h: 256 },
  "rock_golem": { x: 262, y: 522, w: 256, h: 256 },
  "ashen_roc": { x: 522, y: 522, w: 256, h: 256 },
  "sea_serpent": { x: 782, y: 522, w: 256, h: 256 },
  "mimic_chest": { x: 1042, y: 522, w: 256, h: 256 },
  "eye_abomination": { x: 1302, y: 522, w: 256, h: 256 },
  "moss_bear": { x: 1562, y: 522, w: 256, h: 256 },
  "bog_treant": { x: 1822, y: 522, w: 256, h: 256 },
  "toadstool_shaman": { x: 2082, y: 522, w: 256, h: 256 },
  "vine_serpent": { x: 2, y: 782, w: 256, h: 256 },
  "moss_beetle": { x: 262, y: 782, w: 256, h: 256 },
  "forest_dryad": { x: 522, y: 782, w: 256, h: 256 },
  "leaf_goblin": { x: 782, y: 782, w: 256, h: 256 },
  "twin_flytraps": { x: 1042, y: 782, w: 256, h: 256 },
  "mushroom_squirrels": { x: 1302, y: 782, w: 256, h: 256 },
  "slime_snail_forest": { x: 1562, y: 782, w: 256, h: 256 },
  "twig_trickster": { x: 1822, y: 782, w: 256, h: 256 },
  "wasp_scout": { x: 2082, y: 782, w: 256, h: 256 },
};

const BIOME_BOSSES = {
  swamp:     { name: "Basilisk",              sprite: "basilisk" },
  grassland: { name: "Vine Serpent",          sprite: "vine_serpent" },
  forest:    { name: "Twig Trickster",        sprite: "twig_trickster" },
  mountain:  { name: "Flame Knight",          sprite: "flame_knight" },
  jungle:    { name: "Vine Serpent",          sprite: "vine_serpent" },
  desert:    { name: "Basilisk",              sprite: "basilisk" },
  savanna:   { name: "Basilisk",              sprite: "basilisk" },
  tundra:    { name: "Flame Knight",          sprite: "flame_knight" },
  volcanic:  { name: "Flame Knight",          sprite: "flame_knight" },
  glacier:   { name: "Twig Trickster",        sprite: "twig_trickster" },
};


const BOSS_LOOT_NAMES = {
  weapon: [
    "Fang of the Beast", "Titan's Cleaver", "Hydra Tooth Blade", "Colossus Breaker",
    "Treant's Wrath", "Moonlit Fang", "Abyssal Trident", "Stonebreaker Axe",
    "Wolfbane Edge", "Deepwater Glaive", "Bog Reaper", "Thunder Maul",
  ],
  chest: [
    "Beastscale Cuirass", "Titan's Embrace", "Hydra Hide Vest", "Colossus Plate",
    "Treant Bark Armor", "Moonlit Hauberk", "Abyssal Mail", "Stoneheart Plate",
    "Wolfpelt Coat", "Deepwater Scales", "Bog Guardian Vest", "Thunder Aegis",
  ],
  shield: [
    "Beastclaw Shield", "Titan's Bulwark", "Hydra Scale Guard", "Colossus Wall",
    "Treant Root Shield", "Moonlit Ward", "Abyssal Barrier", "Stoneguard Shield",
    "Wolfhide Buckler", "Deepwater Aegis", "Bog Sentinel", "Thunder Guard",
  ],
  head: [
    "Beastcrest Helm", "Titan's Crown", "Hydra Helm", "Colossus Crown",
    "Treant Crest", "Moonlit Crown", "Abyssal Helm", "Stonecrest Helm",
    "Wolfmane Helm", "Deepwater Crown", "Bog Lord's Helm", "Thunder Crown",
  ],
};


// ✅ Get item level from cave key/chunk (must be called after CHUNK_TIERS is defined)
function getItemLevelFromChunk(caveKeyString, playerLevel = 1) {
  if (!caveKeyString) return 1; // Fallback
  const [x, y] = caveKeyString.split(',').map(Number);
  if (isNaN(x) || isNaN(y)) return 1; // Fallback
  
  // This will be called from endCombat where enemy.caveKey = "x,y"
  // We need to find the chunk tier for this position
  // Since CHUNK_TIERS is defined globally, we can use it
  const chunk = getChunkTier(x, y);
  
  if (chunk.isDynamic) {
    return Math.max(1, Math.min(50, playerLevel)); // Clamp 1-50
  }
  
  // ✅ Static chunk: use levelRange[1] (max) - 2 levels
  const maxLevel = chunk.levelRange[1];
  const lootLevel = Math.max(1, maxLevel - 2);
  return Math.min(50, lootLevel);
}

// ✅ Get available rarity indices based on item level
function getAvailableRarityIndices(itemLevel, isFromBossCave = false) {
  // Boss cave loot: ItemLevel 1-5 → always Uncommon
  if (isFromBossCave && itemLevel >= 1 && itemLevel <= 5) {
    return [1]; // Only Uncommon
  }
  
  // ItemLevel 1-5 (non-boss): Only Normal
  if (itemLevel >= 1 && itemLevel <= 5) {
    return [0]; // Only Normal
  }
  
  // ItemLevel 6-10: Normal, Uncommon
  if (itemLevel >= 6 && itemLevel <= 10) {
    return [0, 1]; // Normal, Uncommon
  }
  
  // ItemLevel 11-20: Normal, Uncommon, Rare
  if (itemLevel >= 11 && itemLevel <= 20) {
    return [0, 1, 2]; // Normal, Uncommon, Rare
  }
  
  // ItemLevel 21-40: Normal, Uncommon, Rare, Epic
  if (itemLevel >= 21 && itemLevel <= 40) {
    return [0, 1, 2, 3]; // Normal, Uncommon, Rare, Epic
  }
  
  // ItemLevel 41-50: All rarities
  if (itemLevel >= 41 && itemLevel <= 50) {
    return [0, 1, 2, 3, 4]; // Normal, Uncommon, Rare, Epic, Legendary
  }
  
  // Fallback
  return [0, 1];
}

// ✅ Get weighted drop chances for each rarity by item level (Option 4: Tiered Legendary)
function getDropChancesByItemLevel(itemLevel) {
  // ItemLevel 1-5 (boss): Uncommon 100%
  if (itemLevel >= 1 && itemLevel <= 5) {
    return {
      0: 0.00,   // Normal
      1: 1.00,   // Uncommon 100%
      2: 0.00,   // Rare
      3: 0.00,   // Epic
      4: 0.00    // Legendary
    };
  }
  
  // ItemLevel 6-10: Normal 70%, Uncommon 30%
  if (itemLevel >= 6 && itemLevel <= 10) {
    return {
      0: 0.70,   // Normal
      1: 0.30,   // Uncommon
      2: 0.00,
      3: 0.00,
      4: 0.00
    };
  }
  
  // ItemLevel 11-20: Normal 60%, Uncommon 30%, Rare 10%
  if (itemLevel >= 11 && itemLevel <= 20) {
    return {
      0: 0.60,   // Normal
      1: 0.30,   // Uncommon
      2: 0.10,   // Rare
      3: 0.00,
      4: 0.00
    };
  }
  
  // ItemLevel 21-40: Normal 57%, Uncommon 30%, Rare 10%, Epic 3%
  if (itemLevel >= 21 && itemLevel <= 40) {
    return {
      0: 0.57,   // Normal
      1: 0.30,   // Uncommon
      2: 0.10,   // Rare
      3: 0.03,   // Epic
      4: 0.00
    };
  }
  
  // ItemLevel 41-45: Legendary starts (0.25% - ULTRA RARE)
  if (itemLevel >= 41 && itemLevel <= 45) {
    return {
      0: 0.54,   // Normal
      1: 0.30,   // Uncommon
      2: 0.12,   // Rare
      3: 0.035,  // Epic
      4: 0.0025  // Legendary 0.25% (1 in 400!)
    };
  }
  
  // ItemLevel 46-48: Legendary 0.5% (1 in 200!)
  if (itemLevel >= 46 && itemLevel <= 48) {
    return {
      0: 0.52,   // Normal
      1: 0.30,   // Uncommon
      2: 0.13,   // Rare
      3: 0.04,   // Epic
      4: 0.005   // Legendary 0.5% (1 in 200!)
    };
  }
  
  // ItemLevel 49-50: Legendary 1% (1 in 100) - end game
  if (itemLevel >= 49 && itemLevel <= 50) {
    return {
      0: 0.50,   // Normal
      1: 0.30,   // Uncommon
      2: 0.13,   // Rare
      3: 0.06,   // Epic
      4: 0.01    // Legendary 1% (1 in 100)
    };
  }
  
  // Fallback
  return {
    0: 0.70,
    1: 0.30,
    2: 0.00,
    3: 0.00,
    4: 0.00
  };
}


// ✅ NEW: Generate quest for boss cave
function generateBossCaveQuest(chunkX, chunkY, caveIndex, itemLevel, caveKey) {
  const questId = `boss_cave_${caveKey || `${chunkX}_${chunkY}_${caveIndex}`}`;
  return {
    id: questId,
    questKind: "bossCaveHunt",
    title: `Defeat the Guardian in Cave`,
    description: `Defeat the boss in this cave to claim the treasure.`,
    chunkX, chunkY, caveIndex, itemLevel,
    caveKey,  // Reference to cave position
    targetBosses: 1,
    bossKillCount: 0,
    completed: false,
    accepted: false,
    goldReward: Math.round(100 * (itemLevel / 5)),
    xpReward: Math.round(200 * (itemLevel / 5)),
    rewardLoot: "treasure",
  };
}

function generateBossLoot(chunkLevelRange, biome, seed, isFromBossCave = true) {
  const rng = seededRandom(seed);
  
  // ✅ SCHRITT 1: Bestimme Equipment itemLevel (random aus chunk range)
  const [minLevel, maxLevel] = chunkLevelRange;
  const itemLevel = minLevel + Math.floor(rng() * (maxLevel - minLevel + 1));
  
  // ✅ SCHRITT 2: Hole verfügbare Rarities (vordefiniert im Code)
  const availableRarityIndices = getAvailableRarityIndices(itemLevel, isFromBossCave);
  
  // ✅ SCHRITT 3: Hole Drop-Chancen (vordefiniert im Code)
  const dropChances = getDropChancesByItemLevel(itemLevel);
  
  // ✅ SCHRITT 4: Wähle Rarity basierend auf Chancen
  let roll = rng();
  let cumulative = 0;
  let rarityIdx = availableRarityIndices[0]; // Fallback to first available
  
  for (const idx of availableRarityIndices) {
    cumulative += dropChances[idx] || 0;
    if (roll <= cumulative) {
      rarityIdx = idx;
      break;
    }
  }
  
  const rarity = RARITIES[rarityIdx];
  
  // ✅ SCHRITT 5: Bestimme Slot und Namen
  const slots = ["weapon", "chest", "shield", "head"];
  const slot = slots[Math.floor(rng() * slots.length)];
  const names = BOSS_LOOT_NAMES[slot];
  const name = names[Math.floor(rng() * names.length)];

  // ✅ SCHRITT 6: Berechne Stats (itemLevel * 1.2 * rarity.mult)
  const baseDamage = itemLevel * 1.2;
  const baseDefense = itemLevel * 1.0;          // ✅ Shield: itemLevel * 1.0
  const baseHeadDefense = itemLevel * 0.2;      // ✅ Head: itemLevel * 0.2

  // ✅ SCHRITT 7: Speichere Item mit itemLevel!
  return {
    name, type: "armor", slot, rarity: rarity.name, rarityColor: rarity.color,
    itemLevel,  // ← WICHTIG: itemLevel wird GESPEICHERT im Item!
    bonusDamage: slot === "weapon" ? Math.round(baseDamage * rarity.mult) : 0,
    bonusDefense: slot === "head" ? Math.round(baseHeadDefense * rarity.mult) : (slot === "chest" || slot === "shield" ? Math.round(baseDefense * rarity.mult) : 0),
    bonusStats: slot === "head" ? rollBonusStats(rarityIdx, rng, true) : rollBonusStats(rarityIdx, rng),
    cost: Math.round((itemLevel * 50) * rarity.costMult),
    unique: false, isBossLoot: true,
  };
}

const MERCHANT_ITEMS = {
  Beginner: [
    { name: "Healing Potion", cost: 5, type: "consumable", effect: "heal", value: 30, healPercent: 0.5 },
    { name: "Minor Antidote", cost: 8, type: "consumable", effect: "heal", value: 20 },
    { name: "Bread Loaf", cost: 3, type: "consumable", effect: "heal", value: 15 },
    { name: "Stealth Potion", cost: 15, type: "consumable", effect: "repel", value: 20 },
  ],
  Easy: [
    { name: "Greater Healing Potion", cost: 15, type: "consumable", effect: "heal", value: 50, healPercent: 0.5 },
    { name: "Stamina Elixir", cost: 20, type: "consumable", effect: "heal", value: 40 },
    { name: "Cure Poison", cost: 12, type: "consumable", effect: "heal", value: 30 },
    { name: "Stealth Potion", cost: 30, type: "consumable", effect: "repel", value: 20 },
  ],
  Intermediate: [
    { name: "Superior Healing Potion", cost: 40, type: "consumable", effect: "heal", value: 80, healPercent: 0.5 },
    { name: "Mana Potion", cost: 35, type: "consumable", effect: "heal", value: 70 },
    { name: "Rejuvenation Brew", cost: 50, type: "consumable", effect: "heal", value: 90 },
    { name: "Stealth Potion", cost: 60, type: "consumable", effect: "repel", value: 20 },
  ],
  Hard: [
    { name: "Elixir of Power", cost: 100, type: "consumable", effect: "heal", value: 120, healPercent: 0.5 },
    { name: "Essence of Life", cost: 120, type: "consumable", effect: "heal", value: 150, healPercent: 0.5 },
    { name: "Twilight Draught", cost: 110, type: "consumable", effect: "heal", value: 140, healPercent: 0.5 },
    { name: "Stealth Potion", cost: 120, type: "consumable", effect: "repel", value: 20 },
  ],
  Expert: [
    { name: "Divine Elixir", cost: 250, type: "consumable", effect: "heal", value: 200, healPercent: 0.5 },
    { name: "Immortal Nectar", cost: 300, type: "consumable", effect: "heal", value: 250, healPercent: 0.5 },
    { name: "Essence of Eternity", cost: 280, type: "consumable", effect: "heal", value: 220, healPercent: 0.5 },
    { name: "Stealth Potion", cost: 200, type: "consumable", effect: "repel", value: 20 },
  ],
};

// ✅ NEW: Dynamische Merchant-Tränk-Generierung basierend auf itemLevel
function generateMerchantPotions(playerLevel) {
  const cost = Math.round(5 * Math.pow(1.20, playerLevel - 1));
  const stealthCost = Math.round(cost * 2.5);
  return [
    {
      name: "Healing Potion",
      cost: cost,
      type: "consumable",
      effect: "heal",
      healPercent: 0.5,
    },
    {
      name: "Stealth Potion",
      cost: stealthCost,
      type: "consumable",
      effect: "repel",
      value: 20,
    },
  ];
}

// Pool aller möglichen Attribut-Boni (für Waffen und Rüstungen identisch)
const STAT_POOL = ["strength", "dexterity", "intelligence", "endurance"];

// Zentrale Funktion: gibt bonusStats-Objekt zurück basierend auf Seltenheit
// rarityIdx: 0=Normal, 1=Uncommon, 2=Rare, 3=Epic, 4=Legendary
// rngFn: entweder Math.random oder ein seededRandom()-Aufruf
function rollBonusStats(rarityIdx, rngFn, isHead = false) {
  // Anzahl Boni und Wertebereich je Seltenheit
  const config = [
    { count: 0, min: 0,  max: 0  },  // Normal:    keine
    { count: 1, min: 1,  max: 2  },  // Uncommon:  1 Boni, 1–2
    { count: 2, min: 2,  max: 4  },  // Rare:      2 Boni, 2–4
    { count: 3, min: 5,  max: 10 },  // Epic:      3 Boni, 5–10
    { count: 4, min: 8,  max: 16 },  // Legendary: 4 Boni, 8–16
  ];

  const { count, min, max } = config[rarityIdx] || config[0];
  if (count === 0) return {};

  // Für Helme: 1/4 der Boni (auf whole number runden)
  const actualCount = isHead ? Math.max(0, Math.ceil(count / 4)) : count;
  
  // Attribute ohne Wiederholung aus dem Pool ziehen
  const pool = [...STAT_POOL];
  const chosen = [];
  for (let i = 0; i < actualCount; i++) {
    const idx = Math.floor(rngFn() * pool.length);
    chosen.push(pool.splice(idx, 1)[0]);
  }

  // Jeden Bonus als ganzzahligen Zufallswert im definierten Bereich
  // Für Helme: 1/4 der Werte
  const stats = {};
  for (const stat of chosen) {
    const statValue = min + Math.floor(rngFn() * (max - min + 1));
    stats[stat] = isHead ? Math.max(0, Math.ceil(statValue / 4)) : statValue;
  }
  return stats;
}


const RARITIES = [
  { name: "Normal", color: "#cccccc", mult: 1.0, costMult: 1.0 },
  { name: "Uncommon", color: "#1eff00", mult: 1.1, costMult: 2.0 },
  { name: "Rare", color: "#0070dd", mult: 1.2, costMult: 3.5 },
  { name: "Epic", color: "#a335ee", mult: 1.3, costMult: 6.0 },
  { name: "Legendary", color: "#ff8000", mult: 1.5, costMult: 10.0 },
];


// ============================================================
// SPELLS (Mana-basiert)
// ============================================================
const SPELLS = [
  { id: "fireball", level: 5, name: "🔥 Fireball", manaCost: 15, dmgRange: [20, 30], effect: null },
  { id: "frostbolt", level: 10, name: "❄️ Frostbolt", manaCost: 18, dmgRange: [25, 35], effect: "slow", slowDuration: 3 },
  { id: "lightning", level: 15, name: "⚡ Lightning Storm", manaCost: 22, dmgRange: [15, 20], hitCount: 3 },
  { id: "lifesteal", level: 20, name: "💚 Lifesteal", manaCost: 20, dmgRange: [30, 40], effect: "heal", healPercent: 0.5 },
  { id: "meteor", level: 25, name: "☄️ Meteor Shower", manaCost: 30, dmgRange: [50, 70] },
  { id: "heal", level: 30, name: "💛 Heal", manaCost: 25, dmgRange: [40, 60], effect: "playerHeal" },
  { id: "timewarp", level: 35, name: "⏱️ Time Warp", manaCost: 28, dmgRange: [0, 0], effect: "dodge" },
  { id: "inferno", level: 40, name: "🔥 Inferno", manaCost: 35, dmgRange: [60, 80], effect: "burn", burnDuration: 2 },
  { id: "missiles", level: 45, name: "🎯 Arcane Missile", manaCost: 32, dmgRange: [18, 25], hitCount: 4 },
  { id: "apocalypse", level: 50, name: "💥 Apocalypse", manaCost: 40, dmgRange: [80, 120] },
];

// ============================================================
// SPECIALS (HP-basiert)
// ============================================================
const SPECIALS = [
  { id: "rend", level: 5, name: "🩸 Rend", hpCostPercent: 0.10, dmgRange: [25, 35], effect: "bleed", bleedDuration: 3 },
  { id: "berserk", level: 10, name: "😤 Berserk", hpCostPercent: 0.12, dmgRange: [30, 40], effect: "crit", critBoost: 0.4 },
  { id: "shield", level: 15, name: "🛡️ Shield Bash", hpCostPercent: 0.18, dmgRange: [20, 30], effect: "defense", defBoost: 4 },
  { id: "whirlwind", level: 20, name: "🌪️ Whirlwind", hpCostPercent: 0.20, dmgRange: [15, 20], hitCount: 5 },
  { id: "laststand", level: 25, name: "💪 Last Stand", hpCostPercent: 0.25, dmgRange: [60, 80], effect: "heal", healPercent: 0.3 },
  { id: "poison_attack", level: 26, name: "☠️ Poison Dart", hpCostPercent: 0.16, dmgRange: [20, 30], effect: "poison", poisonDuration: 5 },
  { id: "executioner", level: 30, name: "⚔️ Executioner", hpCostPercent: 0.22, dmgRange: [70, 90] },
  { id: "thorns", level: 35, name: "🌹 Thorns Aura", hpCostPercent: 0.18, dmgRange: [15, 25], effect: "reflect" },
  { id: "cleave", level: 40, name: "🗡️ Cleave", hpCostPercent: 0.24, dmgRange: [50, 70], hitCount: 2, effect: "stun", stunDuration: 2 },
  { id: "overdrive", level: 45, name: "⚙️ Overdrive", hpCostPercent: 0.28, dmgRange: [80, 110], effect: "crit", critBoost: 0.6 },
  { id: "cataclysm", level: 50, name: "💣 Cataclysm", hpCostPercent: 0.30, dmgRange: [100, 150] },
];



// ============================================================
// STAT COMBOS & BASE STATS (used by old system, kept for reference)
// ============================================================


// ============================================================
// ✅ BLACKSMITH ITEMS: Item-Level Based (1-50)
// Now generates items based on ItemLevel, not Difficulty
// ============================================================

const ARMOR_NAMES = {
  weapon: {
    Beginner: ["Wooden Sword", "Rusty Dagger", "Iron Sword", "Steel Blade", "Battle Axe"],
    Easy: ["Iron Sword", "Steel Dagger", "War Hammer", "Broad Sword", "Long Spear"],
    Intermediate: ["Longsword", "Cleaver", "Mace", "Halberd", "Scimitar", "Flail"],
    Hard: ["Greatsword", "Executioner's Axe", "Warhammer", "Pike", "Katana", "Claymore"],
    Expert: ["Soul Reaper", "Nightfall", "Frostbrand", "Inferno", "Void Edge", "Celestial Blade"],
  },
  chest: {
    Beginner: ["Cloth Tunic", "Leather Vest", "Hide Armor", "Cloth Robe", "Simple Shirt"],
    Easy: ["Leather Armor", "Studded Vest", "Chainmail", "Scale Armor", "Plate Vest"],
    Intermediate: ["Full Plate", "Dragon Scale", "Enchanted Armor", "Mithril Plate", "Adamant Mail"],
    Hard: ["Obsidian Plate", "Shadow Armor", "Radiant Plate", "Twilight Mail", "Eternal Armor"],
    Expert: ["Celestial Plate", "Void Armor", "Essence Plate", "Absolute Mail", "Omega Plate"],
  },
  shield: {
    Beginner: ["Wooden Buckler", "Hide Shield", "Wooden Shield", "Leather Shield", "Basic Board"],
    Easy: ["Iron Shield", "Wooden Kite Shield", "Round Shield", "Heater Shield", "Kite Shield"],
    Intermediate: ["Tower Shield", "Knight's Shield", "Enchanted Shield", "Dragon Shield", "Phoenix Guard"],
    Hard: ["Obsidian Shield", "Shadow Ward", "Radiant Guard", "Twilight Shield", "Eternal Ward"],
    Expert: ["Celestial Ward", "Void Guard", "Essence Shield", "Absolute Ward", "Omega Guard"],
  },
  head: {
    Beginner: ["Cloth Helmet", "Leather Helmet", "Hide Helmet", "Cloth Coif", "Simple Cap"],
    Easy: ["Leather Helmet", "Studded Helmet", "Chainmail Helmet", "Scale Helmet", "Plate Helmet"],
    Intermediate: ["Full Helmet", "Dragon Helmet", "Enchanted Helmet", "Mithril Helmet", "Adamant Helmet"],
    Hard: ["Obsidian Helmet", "Shadow Helmet", "Radiant Helmet", "Twilight Helmet", "Eternal Helmet"],
    Expert: ["Celestial Helmet", "Void Helmet", "Essence Helmet", "Absolute Helmet", "Omega Helmet"],
  },
};

function generateShopItems(cityName, itemLevelMin, itemLevelMax, seed) {
  // ✅ UPDATED: ItemLevel-based shop items mit Random Levels und Drop-Chancen
  // Schmied nutzt jetzt das gleiche System wie Boss Loot!
  // UNTERSCHIED A bleibt: Nur itemLevelMin bis itemLevelMax (gekürzt)
  // UNTERSCHIED B geändert: itemLevel ist RANDOM, nicht zyklisch!
  // UNTERSCHIED C geändert: Nutzt getDropChancesByItemLevel() wie Boss!
  
  const rng = seededRandom(seed + cityName.length * 7 + cityName.charCodeAt(0) * 31);
  const items = [];
  const slots = ["weapon", "chest", "shield", "head"];
  
  // ✅ Determine difficulty tier for name selection (based on min level for flavor)
  let difficultyTier = "Beginner";
  if (itemLevelMin >= 40) difficultyTier = "Expert";
  else if (itemLevelMin >= 30) difficultyTier = "Hard";
  else if (itemLevelMin >= 20) difficultyTier = "Intermediate";
  else if (itemLevelMin >= 10) difficultyTier = "Easy";
  
  // ✅ Helper: Generate random itemLevel aus [itemLevelMin, itemLevelMax]
  const generateRandomItemLevel = () => {
    return itemLevelMin + Math.floor(rng() * (itemLevelMax - itemLevelMin + 1));
  };
  
  for (const slot of slots) {
    const names = ARMOR_NAMES[slot][difficultyTier] || ARMOR_NAMES[slot].Beginner;

    // Always 2 Normal items per slot
    for (let n = 0; n < 2; n++) {
      // ✅ UNTERSCHIED B: itemLevel ist RANDOM, nicht zyklisch!
      const itemLevel = generateRandomItemLevel();
      const baseDamage = itemLevel * 1.2;
      const baseDefense = itemLevel * 1.0;          // ✅ Shield: itemLevel * 1.0
      const baseHeadDefense = itemLevel * 0.2;      // ✅ Head: itemLevel * 0.2
      
      const name = names[Math.floor(rng() * names.length)];
      const rarity = RARITIES[0];
      items.push({
        name, type: "armor", slot, rarity: rarity.name, rarityColor: rarity.color,
        itemLevel,
        bonusDamage:  slot === "weapon" ? Math.round(baseDamage  * rarity.mult) : 0,
        bonusDefense: slot === "head" ? Math.round(baseHeadDefense * rarity.mult) : (slot === "chest" || slot === "shield" ? Math.round(baseDefense * rarity.mult) : 0),
        bonusStats: slot === "head" ? rollBonusStats(0, rng, true) : rollBonusStats(0, rng),
        cost: Math.round((itemLevel * 50) * rarity.costMult * (0.8 + rng() * 0.4)),
        unique: false,
      });
    }

    // Uncommon (if available) - ✅ UNTERSCHIED C: Nutze Drop-Chancen!
    if (rng() < 0.30) {
      const itemLevel = generateRandomItemLevel();
      const baseDamage = itemLevel * 1.2;
      const baseDefense = itemLevel * 1.0;          // ✅ Shield: itemLevel * 1.0
      const baseHeadDefense = itemLevel * 0.2;      // ✅ Head: itemLevel * 0.2
      
      const availableRarities = getAvailableRarityIndices(itemLevel, false);
      const dropChances = getDropChancesByItemLevel(itemLevel);
      
      // Wähle Rarity basierend auf Drop-Chancen
      let roll = rng();
      let cumulative = 0;
      let rarityIdx = availableRarities[0];
      for (const idx of availableRarities) {
        cumulative += dropChances[idx] || 0;
        if (roll <= cumulative) {
          rarityIdx = idx;
          break;
        }
      }
      
      // Nur wenn Uncommon (oder besser) verfügbar ist
      if (rarityIdx >= 1) {
        const rarity = RARITIES[rarityIdx];
        const name = names[Math.floor(rng() * names.length)];
        items.push({
          name: `${name} of ${["Power","Might","Grace","Fortitude","Valor","Wrath","Wisdom"][Math.floor(rng() * 7)]}`,
          type: "armor", slot, rarity: rarity.name, rarityColor: rarity.color,
          itemLevel,
          bonusDamage:  slot === "weapon" ? Math.round(baseDamage  * rarity.mult) : 0,
          bonusDefense: slot === "head" ? Math.round(baseHeadDefense * rarity.mult) : (slot === "chest" || slot === "shield" ? Math.round(baseDefense * rarity.mult) : 0),
          bonusStats: slot === "head" ? rollBonusStats(rarityIdx, rng, true) : rollBonusStats(rarityIdx, rng),
          cost: Math.round((itemLevel * 50) * rarity.costMult * (0.9 + rng() * 0.3)),
          unique: true, uid: `uc_${cityName}_${slot}_${Math.floor(rng() * 99999)}`,
        });
      }
    }

    // Rare (if available) - ✅ UNTERSCHIED C: Nutze Drop-Chancen!
    if (rng() < 0.15) {
      const itemLevel = generateRandomItemLevel();
      const baseDamage = itemLevel * 1.2;
      const baseDefense = itemLevel * 1.0;          // ✅ Shield: itemLevel * 1.0
      const baseHeadDefense = itemLevel * 0.2;      // ✅ Head: itemLevel * 0.2
      
      const availableRarities = getAvailableRarityIndices(itemLevel, false);
      const dropChances = getDropChancesByItemLevel(itemLevel);
      
      // Wähle Rarity basierend auf Drop-Chancen
      let roll = rng();
      let cumulative = 0;
      let rarityIdx = availableRarities[0];
      for (const idx of availableRarities) {
        cumulative += dropChances[idx] || 0;
        if (roll <= cumulative) {
          rarityIdx = idx;
          break;
        }
      }
      
      // Nur wenn Rare (oder besser) verfügbar ist
      if (rarityIdx >= 2) {
        const rarity = RARITIES[rarityIdx];
        const name = names[Math.floor(rng() * names.length)];
        items.push({
          name: `${name} of the ${["Phoenix","Dragon","Titan","Archmage","Storm","Shadow","Void"][Math.floor(rng() * 7)]}`,
          type: "armor", slot, rarity: rarity.name, rarityColor: rarity.color,
          itemLevel,
          bonusDamage:  slot === "weapon" ? Math.round(baseDamage  * rarity.mult) : 0,
          bonusDefense: slot === "head" ? Math.round(baseHeadDefense * rarity.mult) : (slot === "chest" || slot === "shield" ? Math.round(baseDefense * rarity.mult) : 0),
          bonusStats: slot === "head" ? rollBonusStats(rarityIdx, rng, true) : rollBonusStats(rarityIdx, rng),
          cost: Math.round((itemLevel * 50) * rarity.costMult * (0.9 + rng() * 0.3)),
          unique: true, uid: `ra_${cityName}_${slot}_${Math.floor(rng() * 99999)}`,
        });
      }
    }

    // Epic (if available) - ✅ UNTERSCHIED C: Nutze Drop-Chancen!
    if (rng() < 0.08) {
      const itemLevel = generateRandomItemLevel();
      const baseDamage = itemLevel * 1.2;
      const baseDefense = itemLevel * 1.0;          // ✅ Shield: itemLevel * 1.0
      const baseHeadDefense = itemLevel * 0.2;      // ✅ Head: itemLevel * 0.2
      
      const availableRarities = getAvailableRarityIndices(itemLevel, false);
      const dropChances = getDropChancesByItemLevel(itemLevel);
      
      // Wähle Rarity basierend auf Drop-Chancen
      let roll = rng();
      let cumulative = 0;
      let rarityIdx = availableRarities[0];
      for (const idx of availableRarities) {
        cumulative += dropChances[idx] || 0;
        if (roll <= cumulative) {
          rarityIdx = idx;
          break;
        }
      }
      
      // Nur wenn Epic (oder besser, z.B. Legendary) verfügbar ist
      if (rarityIdx >= 3) {
        const rarity = RARITIES[rarityIdx];
        const name = names[Math.floor(rng() * names.length)];
        items.push({
          name: `${name} of ${["Eternity","Destiny","Infinity","Chaos","Divinity"][Math.floor(rng() * 5)]}`,
          type: "armor", slot, rarity: rarity.name, rarityColor: rarity.color,
          itemLevel,
          bonusDamage:  slot === "weapon" ? Math.round(baseDamage  * rarity.mult) : 0,
          bonusDefense: slot === "head" ? Math.round(baseHeadDefense * rarity.mult) : (slot === "chest" || slot === "shield" ? Math.round(baseDefense * rarity.mult) : 0),
          bonusStats: slot === "head" ? rollBonusStats(rarityIdx, rng, true) : rollBonusStats(rarityIdx, rng),
          cost: Math.round((itemLevel * 50) * rarity.costMult * (0.9 + rng() * 0.3)),
          unique: true, uid: `ep_${cityName}_${slot}_${Math.floor(rng() * 99999)}`,
        });
      }
    }
  }

  return items;
}

const QUEST_ITEMS_POOL = {
  Beginner: ["Herb", "Goblin Ear", "Wolf Fang", "Hide", "Mushroom", "Feather"],
  Easy: ["Orc Tooth", "Iron Ore", "Bone", "Gold Coin", "Spider Silk", "Venom Sac"],
  Intermediate: ["Troll Hide", "Club", "Wyvern Scale", "Dragon Horn", "Dark Essence", "Evil Amulet"],
  Hard: ["Dragon Scale", "Curse Orb", "Demonic Essence", "Infernal Blade", "Soul Stone", "Dark Staff"],
  Expert: ["Crown Fragment", "Soul Gem", "Void Crystal", "Reality Tear", "Divine Essence", "God's Blessing"],
};

const ENEMY_NAMES_BY_DIFFICULTY = {
  Beginner: ["Bramble Boar", "Leaf Goblin", "Wasp Scout", "Slime Snail", "Bog Frog", "Mushroom Squirrels"],
  Easy: ["Orc Warchief", "Moss Beetle", "Dusk Harpy", "Goblin Warlock", "Forest Dryad", "Venom Snail"],
  Intermediate: ["Brutal Ogre", "Ember Drake", "Lava Scorpion", "Ice Ogre", "Man Eater", "Toadstool Shaman"],
  Hard: ["Rock Golem", "Ashen Roc", "Pyre Tortoise", "Eye Abomination", "Sea Serpent", "Scarab Tank"],
  Expert: ["Ember Drake", "Brutal Ogre", "Eye Abomination", "Cursed Mummy", "Ice Ogre", "Pyre Tortoise"],
};

const CITY_NAMES = [ "Eldoria", "Thornwall", "Misthollow", "Ironforge", "Darkwater", "Sunspire",
  "Ashvale", "Frostpeak", "Goldcrest", "Shadowmere", "Brightkeep", "Stormhaven",
  "Moonfall", "Ravencrest", "Duskwind", "Starhold", "Flamecrest", "Crystalvale",
  "Grimwatch", "Silverpine", "Embercross", "Nightshade", "Willowbrook", "Ironhelm",
  "Dragonrest", "Wyrmgate", "Lichfield", "Doomspire", "Celestia", "Voidreach",
];

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function seededRandom(seed) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

function noise2D(x, y, seed) {
  let h = (x * 374761393 + y * 668265263 + seed) | 0;
  h = ((h ^ (h >>> 13)) * 1274126177) | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function smoothNoise(x, y, seed, scale) {
  const sx = x / scale, sy = y / scale;
  const x0 = Math.floor(sx), y0 = Math.floor(sy);
  const fx = sx - x0, fy = sy - y0;
  const v00 = noise2D(x0, y0, seed);
  const v10 = noise2D(x0 + 1, y0, seed);
  const v01 = noise2D(x0, y0 + 1, seed);
  const v11 = noise2D(x0 + 1, y0 + 1, seed);
  const ix0 = v00 + (v10 - v00) * fx;
  const ix1 = v01 + (v11 - v01) * fx;
  return ix0 + (ix1 - ix0) * fy;
}

function getBiome(x, y, seed) {
  // === ELEVATION ===
  const e1 = smoothNoise(x, y, seed, 160);
  const e2 = smoothNoise(x, y, seed + 500, 70);
  const e3 = smoothNoise(x, y, seed + 1100, 30);
  const e4 = smoothNoise(x, y, seed + 1600, 12);
  let elevation = e1 * 0.35 + e2 * 0.3 + e3 * 0.22 + e4 * 0.13;

  // Domain warp for organic shapes
  const warpX = smoothNoise(x, y, seed + 3000, 100) * 45 - 22;
  const warpY = smoothNoise(x, y, seed + 4000, 100) * 45 - 22;
  const continent = smoothNoise(x + warpX, y + warpY, seed + 2000, 180);
  elevation = elevation * 0.4 + continent * 0.6;

  // Boost elevation toward center to ensure land-heavy map
  const cx = WORLD_SIZE / 2, cy = WORLD_SIZE / 2;
  const distFromCenter = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / (WORLD_SIZE * 0.5);
  const centerBoost = Math.max(0, 1 - distFromCenter * 0.9);
  elevation = elevation * 0.7 + centerBoost * 0.3;

  // Only sink edges toward ocean — create bays and inlets, not full ocean ring
  const edgeDist = Math.min(x, y, WORLD_SIZE - 1 - x, WORLD_SIZE - 1 - y);
  const edgeFade = Math.min(1, edgeDist / 40);
  const edgeNoise = smoothNoise(x, y, seed + 12000, 50) * 0.15;
  elevation = elevation * (0.35 + 0.65 * edgeFade) + edgeNoise * (1 - edgeFade);

  // Mountain ridges — spine-like chains
  const ridge1 = smoothNoise(x, y, seed + 11000, 55);
  const ridge2 = smoothNoise(x, y, seed + 11500, 30);
  const ridgeSharp = Math.abs(ridge1 - 0.5) * 2;
  const ridgeDetail = Math.abs(ridge2 - 0.5) * 2;
  const isMtnRidge = ridgeSharp < 0.1 && ridgeDetail < 0.35 && elevation > 0.38;

  // Mountain clusters — isolated peaks and ranges
  const cluster = smoothNoise(x, y, seed + 13000, 22);
  const isMtnCluster = cluster > 0.78 && elevation > 0.42;

  // === TEMPERATURE ===
  const ny = y / WORLD_SIZE;
  const latBase = 1 - 1.6 * Math.abs(ny - 0.5);
  const tempNoise = smoothNoise(x, y, seed + 5000, 90) * 0.18;
  const temperature = Math.max(0, Math.min(1, latBase * 0.6 + tempNoise + 0.25));

  // === MOISTURE ===
  const m1 = smoothNoise(x, y, seed + 6000, 80);
  const m2 = smoothNoise(x, y, seed + 7000, 35);
  let moisture = m1 * 0.65 + m2 * 0.35;
  if (elevation < 0.38) moisture = Math.min(1, moisture + 0.1);

  // === SEA (only at edges and low-elevation bays) ===
  const seaLevel = 0.32;
  if (elevation < seaLevel - 0.03) return "ocean";
  if (elevation < seaLevel) return "coast";

  // === RIVERS ===
  const r1 = smoothNoise(x, y, seed + 9000, 50);
  const r2 = smoothNoise(x, y, seed + 9500, 80);
  const rw = 0.015;
  const isR1 = Math.abs(r1 - 0.5) < rw && elevation > seaLevel && elevation < 0.58;
  const isR2 = Math.abs(r2 - 0.5) < rw * 0.8 && elevation > seaLevel && elevation < 0.52;
  if (isR1 || isR2) {
    if (isR1 && isR2 && elevation < 0.45) return "lake";
    return "river";
  }

  // === MOUNTAINS ===
  if (isMtnRidge || isMtnCluster) {
    if (temperature < 0.22) return "glacier";
    return "mountain";
  }
  if (elevation > 0.7) {
    if (temperature < 0.22) return "glacier";
    return "mountain";
  }

  // Volcanic — very rare
  const hotspot = smoothNoise(x, y, seed + 8000, 45);
  if (hotspot > 0.93 && elevation > 0.5 && temperature > 0.5) return "volcanic";

  // === LAND BIOMES ===
  // Polar
  if (temperature < 0.18) return elevation > 0.52 ? "glacier" : "tundra";

  // Cold
  if (temperature < 0.32) {
    if (moisture > 0.52) return "tundra";
    return "tundra";
  }

  // Cool
  if (temperature < 0.48) {
    if (moisture > 0.6) return "forest";
    if (moisture > 0.38) return "grassland";
    return "grassland";
  }

  // Temperate — dominant biome zone, mostly green
  if (temperature < 0.62) {
    if (moisture > 0.62) return "forest";
    if (moisture > 0.35) return "grassland";
    return "grassland";
  }

  // Warm
  if (temperature < 0.76) {
    if (moisture > 0.6) return "jungle";
    if (moisture > 0.42) return "forest";
    if (moisture > 0.28) return "savanna";
    return "desert";
  }

  // Hot
  if (moisture < 0.22) return "desert";
  if (moisture < 0.38) return "savanna";
  if (moisture > 0.58) return "jungle";
  if (moisture > 0.42) return "swamp";
  return "savanna";
}

function getChunkTier(x, y) {
  // Ignoriere Ocean-Biom - beginne erst ab Coast
  // Finde den Chunk basierend auf x,y Koordinaten
  // ✅ FIX: Use inclusive boundaries (<=) to avoid gaps between chunks
  // Positions like (300, 150) that fall on boundaries now assign correctly
  for (const chunk of CHUNK_TIERS) {
    if (x >= chunk.xMin && x <= chunk.xMax && y >= chunk.yMin && y <= chunk.yMax) {
      return chunk;
    }
  }
  // Fallback zur Starter-Zone (Chunk 10 = "Starter Plains", Level 1-5)
  return CHUNK_TIERS.find(c => c.id === 10);
}

// Maps a levelRange minimum to the old 5-tier name used by pools/shops/quests.
// This is the single authoritative bridge between chunk system and tier-keyed data.
function getDifficultyTier(minLevel) {
  if (minLevel >= 41) return "Expert";
  if (minLevel >= 26) return "Hard";
  if (minLevel >= 16) return "Intermediate";
  if (minLevel >= 6)  return "Easy";
  return "Beginner";
}

// Tier → display colour (replaces DIFFICULTY_ZONES colour lookup everywhere)
const TIER_COLORS = {
  Beginner:     "#4ade80",
  Easy:         "#facc15",
  Intermediate: "#fb923c",
  Hard:         "#ef4444",
  Expert:       "#a855f7",
};

function getDifficulty(x, y, playerLevel = 1) {
  const chunk = getChunkTier(x, y);

  if (chunk.isDynamic) {
    const tier = getDifficultyTier(playerLevel);
    return {
      name: chunk.name,
      tier,
      color: TIER_COLORS[tier],
      levelRange: [playerLevel, playerLevel],
      itemLevel: playerLevel,
      encounterRate: 0.35,
      isDynamic: true,
      playerLevel,
    };
  }

  const minLevel = chunk.levelRange[0];
  const tier = getDifficultyTier(minLevel);
  return {
    name: chunk.name,
    tier,
    color: TIER_COLORS[tier],
    levelRange: chunk.levelRange,
    itemLevel: minLevel,
    encounterRate: 0.35,
    isDynamic: false,
  };
}

function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function getStatusEmoji(statusType) {
  const emojis = {
    bleed: "🩸",
    burn: "🔥",
    poison: "☠️",
    freeze: "❄️",
    stun: "😵"
  };
  return emojis[statusType] || "⚠️";
}

// ✅ NEW: BUFF EMOJI FUNKTION
function getBuffEmoji(buffType) {
  const emojis = {
    critBoost: "⚡",
    defense: "🛡️",
    stealth: "🌀"
  };
  return emojis[buffType] || "✨";
}

function getUniqueStacks(inv) {
  const names = new Set();
  inv.forEach(i => names.add(i.name));
  return names.size;
}

function canAddItems(inv, newItems) {
  const names = new Set();
  inv.forEach(i => names.add(i.name));
  const before = names.size;
  newItems.forEach(i => names.add(i.name));
  return names.size <= INVENTORY_CAPACITY;
}

function canAddItem(inv, item) {
  return canAddItems(inv, [item]);
}

const CHUNK_SIZE = 64;
const TOTAL_CHUNKS = Math.ceil(WORLD_SIZE / CHUNK_SIZE);

// ============================================================
// ✅ FLOATING DAMAGE TEXT COMPONENT
// ============================================================

function FloatingDamageText({ damage, x, y, isCrit = false, isHeal = false, isBuff = false, isMiss = false }) {
  // Bestimme Farbe, Icon und Größe basierend auf Effekt-Typ
  let color = '#ff0000';      // Normal: ROT
  let fontSize = 36.45;       // 40.5 * 0.9 = 36.45px (-10%)
  let fontWeight = 700;
  let icon = '⚔️';
  
  if (isCrit) {
    color = '#ffff00';        // Crit: GELB
    fontSize = 44.55;         // 49.5 * 0.9 = 44.55px (-10%)
    fontWeight = 900;
    icon = '💥';              // EXPLOSION statt Blitz
  } else if (isHeal) {
    color = '#00ff00';        // Heal: GRÜN
    fontSize = 36.45;         // 40.5 * 0.9 = 36.45px (-10%)
    fontWeight = 700;
    icon = '✨';
  } else if (isBuff) {
    color = '#00ccff';        // Buff: Cyan/Blau
    fontSize = 32.4;          // 36 * 0.9 = 32.4px (-10%)
    fontWeight = 700;
    icon = '💫';
  } else if (isMiss) {
    color = '#ff6666';        // Miss: Rot
    fontSize = 32.4;          // 36 * 0.9 = 32.4px (-10%)
    fontWeight = 700;
    icon = '✗';
  }
  
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        pointerEvents: 'none',
        color: color,
        fontSize: fontSize,
        fontWeight: fontWeight,
        textShadow: '2px 2px 8px rgba(0,0,0,0.9), 0 0 10px rgba(0,0,0,0.5)',
        zIndex: 9999,
        userSelect: 'none',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        whiteSpace: 'nowrap',
        animation: 'floatUp 1s ease-out forwards',  // ✅ CSS Animation statt setInterval
        transformOrigin: 'center center'
      }}
    >
      <div style={{ fontSize: fontSize + 6 }}>{icon}</div>
      <div>{damage}</div>
    </div>
  );
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function chunkKey(cx, cy) { return `${cx},${cy}`; }

function generateChunkCities(chunkX, chunkY, seed, existingCities) {
  const cities = {};
  const rng = seededRandom(seed + 9999 + chunkX * 7919 + chunkY * 6271);
  const x0 = chunkX * CHUNK_SIZE, y0 = chunkY * CHUNK_SIZE;
  const x1 = Math.min(x0 + CHUNK_SIZE, WORLD_SIZE - 4);
  const y1 = Math.min(y0 + CHUNK_SIZE, WORLD_SIZE - 4);
  
  // Determine target number of cities based on chunk level
  const chunk = getChunkTier(chunkX * CHUNK_SIZE + CHUNK_SIZE/2, chunkY * CHUNK_SIZE + CHUNK_SIZE/2);
  let baseLevel = 1;
  if (chunk && chunk.levelRange) {
    baseLevel = chunk.levelRange[0];
  } else if (chunk && chunk.isDynamic) {
    baseLevel = 50; // Assume high level for dynamic chunks
  }
  
  // Determine target city count
  let targetCities = 4;
  if (baseLevel <= 20) {
    // Light areas: 7-9 cities
    targetCities = 7 + Math.floor(rng() * 3);  // 7, 8, or 9
  } else if (baseLevel <= 40) {
    // Medium areas: 5-7 cities
    targetCities = 5 + Math.floor(rng() * 3);  // 5, 6, or 7
  } else {
    // Heavy areas: 4-5 cities
    targetCities = 4 + Math.floor(rng() * 2);  // 4 or 5
  }
  
  // Collect valid city positions
  const validPositions = [];
  for (let y = Math.max(4, y0); y < y1; y += 8) {
    for (let x = Math.max(4, x0); x < x1; x += 8) {
      const biome = getBiome(x, y, seed);
      if (biome === "ocean" || biome === "coast" || biome === "glacier" || biome === "volcanic" || biome === "river" || biome === "lake") continue;
      validPositions.push({ x, y });
    }
  }
  
  // Shuffle positions
  for (let i = validPositions.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [validPositions[i], validPositions[j]] = [validPositions[j], validPositions[i]];
  }
  
  // Place cities
  for (const pos of validPositions) {
    if (Object.keys(cities).length >= targetCities) break;
    
    const key = `${pos.x},${pos.y}`;
    let tooClose = false;
    
    // Check against existing cities AND cities generated in this chunk
    const allCities = { ...existingCities, ...cities };
    for (const ck of Object.keys(allCities)) {
      const [cx, cy] = ck.split(",").map(Number);
      if (Math.abs(cx - pos.x) < 20 && Math.abs(cy - pos.y) < 20) { 
        tooClose = true; 
        break; 
      }
    }
    
    if (!tooClose) {
      const totalIdx = Object.keys(existingCities).length + Object.keys(cities).length;
      const diff = getDifficulty(pos.x, pos.y);
      cities[key] = {
        name: CITY_NAMES[totalIdx % CITY_NAMES.length] + (totalIdx >= CITY_NAMES.length ? ` ${Math.floor(totalIdx / CITY_NAMES.length) + 1}` : ""),
        x: pos.x, y: pos.y,
        difficulty: diff.tier,   // ← tier string ("Beginner"…"Expert") for shop/quest keys
        itemLevel: diff.itemLevel, // ← numeric level for scaling
      };
    }
  }
  
  return cities;
}

// ============================================================
// ✅ BOSS SCALING SYSTEM BASED ON ITEM LEVEL
// ============================================================
// NEW: Using same exponential formula as normal monsters (1.15^(level-1))
// Boss is 6x stronger due to higher base stats

const BOSS_ITEM_LEVEL_STATS = {
  baseHp:   50,   // ✅ Changed: 12 → 50
  baseAtk:   8,   // ✅ Changed: 18 → 8
  baseXp:   150,  // ✅ Changed: 300 → 150
  baseGold: 100,  // ✅ Changed: 80 → 100
};

function getScaledBossStats(itemLevel) {
  // ✅ Boss scaling: 1.14^(level-1)
  const scale = Math.pow(1.14, itemLevel - 1);
  
  const xpScale = Math.pow(1.18, itemLevel - 1);
  const goldScale = Math.pow(1.18, itemLevel - 1);
  
  return {
    hp:   Math.round(BOSS_ITEM_LEVEL_STATS.baseHp * scale),
    atk:  Math.round(BOSS_ITEM_LEVEL_STATS.baseAtk * scale),
    xp:   Math.round(BOSS_ITEM_LEVEL_STATS.baseXp * xpScale),
    gold: Math.round(BOSS_ITEM_LEVEL_STATS.baseGold * goldScale),
    dmg:  Math.round(itemLevel * 2.5),
    def:  Math.round(itemLevel * 1.8),
  };
}

function getBossBiomeMultiplier(biome) {
  const mults = {
    grassland: 1.0, forest: 1.0, jungle: 1.1, swamp: 0.9,
    mountain: 1.2, desert: 1.1, savanna: 1.15, tundra: 1.25,
    volcanic: 1.3, glacier: 1.2, river: 0.85, lake: 0.9,
  };
  return mults[biome] || 1.0;
}

function applyBiomeMultiplier(stats, biome) {
  const mult = getBossBiomeMultiplier(biome);
  return {
    hp: Math.round(stats.hp * mult),
    atk: Math.round(stats.atk * mult),
    xp: Math.round(stats.xp * mult),
    gold: Math.round(stats.gold * mult),
    dmg: Math.round(stats.dmg * mult),
    def: Math.round(stats.def * mult),
  };
}

function generateRegionCaves(regionId, seed, cities, existingCaves) {
  const region = CHUNK_TIERS.find(c => c.id === regionId);
  if (!region) return [];
  
  const rng = seededRandom(seed + 88888 + regionId * 5551);
  const x0 = region.xMin;
  const y0 = region.yMin;
  const x1 = region.xMax;
  const y1 = region.yMax;
  const step = Math.max(1, Math.floor((x1 - x0) / 16));  // ✅ Scan region bounds, not chunk
  const cityList = Object.keys(cities).map(k => { const [x,y] = k.split(",").map(Number); return {x,y}; });

  const caves = [];
  
  // Helper function to find a valid cave position within REGION
  const findValidCavePosition = (existingKeys) => {
    const maxAttempts = 200;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const x = Math.floor(x0 + rng() * (x1 - x0));
      const y = Math.floor(y0 + rng() * (y1 - y0));
      if (x < 4 || y < 4) continue;
      const key = `${x},${y}`;
      if (existingCaves[key] || existingKeys.has(key)) continue;
      let nearCity = false;
      for (const c of cityList) {
        if (Math.abs(c.x - x) < 15 && Math.abs(c.y - y) < 15) { nearCity = true; break; }
      }
      if (nearCity) continue;
      const biome = getBiome(x, y, seed);
      if (!BIOME_BOSSES[biome]) continue;
      return { x, y, biome };
    }
    return null;
  };
  
  // Helper function to create cave object
  const createCave = (pick, caveIndex = 0) => {
    const key = `${pick.x},${pick.y}`;
    const biome = pick.biome;
    const boss = BIOME_BOSSES[biome];
    
    // ✅ Get item level for this REGION (use max level of region)
    let itemLevel = 1;
    if (region && region.levelRange) {
      itemLevel = region.levelRange[1]; // ✅ Use MAX level of region
    } else if (region && region.isDynamic) {
      itemLevel = 25;  // Default for dynamic
    }
    
    // ✅ Use scaled boss stats based on item level
    const baseStats = getScaledBossStats(itemLevel);
    const scaledStats = applyBiomeMultiplier(baseStats, biome);
    
    return {
      key,
      cave: {
        x: pick.x, y: pick.y, biome: biome, 
        difficulty: `Level ${itemLevel}`,
        itemLevel,
        bossName: boss.name, bossSprite: boss.sprite,
        bossHp: scaledStats.hp,
        bossAtk: scaledStats.atk,
        bossXp: scaledStats.xp,
        bossGold: scaledStats.gold,
        bossDmg: scaledStats.dmg,
        bossDef: scaledStats.def,
        lootSeed: Math.floor(rng() * 99999),
        isBossCave: true,
        questId: `boss_cave_${regionId}_${caveIndex}`,  // ✅ Quest link uses regionId
      }
    };
  };
  
  // ✅ Generate exactly 10 caves per REGION (not per chunk!)
  const cavesToGenerate = 10;
  const placedKeys = new Set();

  for (let i = 0; i < cavesToGenerate; i++) {
    const pick = findValidCavePosition(placedKeys);
    if (pick) {
      placedKeys.add(`${pick.x},${pick.y}`);
      caves.push(createCave(pick, i));
    }
  }
  
  return caves;  // ✅ Return array of caves for this region
}

// ============================================================
// CHUNK CAVES (DEPRECATED - kept for compatibility)
// ============================================================
function generateChunkCaves(chunkX, chunkY, seed, cities, existingCaves) {
  // ✅ NEW: This function now delegates to region-based generation
  // Find which region this chunk belongs to and generate caves for that region only once
  const chunkCenterX = chunkX * CHUNK_SIZE + CHUNK_SIZE/2;
  const chunkCenterY = chunkY * CHUNK_SIZE + CHUNK_SIZE/2;
  const chunkRegion = getChunkTier(chunkCenterX, chunkCenterY);
  
  if (!chunkRegion) return [];
  
  // ✅ Generate caves for the REGION (not the chunk)
  // But only return caves that fall within THIS chunk's bounds (for compatibility)
  const x0 = chunkX * CHUNK_SIZE;
  const y0 = chunkY * CHUNK_SIZE;
  const x1 = Math.min(x0 + CHUNK_SIZE, WORLD_SIZE - 4);
  const y1 = Math.min(y0 + CHUNK_SIZE, WORLD_SIZE - 4);
  
  const allRegionCaves = generateRegionCaves(chunkRegion.id, seed, cities, existingCaves);
  
  // ✅ Filter: Only return caves within this chunk's bounds
  const cavesInThisChunk = allRegionCaves.filter(caveObj => {
    const cx = caveObj.cave.x;
    const cy = caveObj.cave.y;
    return cx >= x0 && cx < x1 && cy >= y0 && cy < y1;
  });
  
  return cavesInThisChunk;
}

// ============================================================
// GUARANTEED ZONE CAVES
// ============================================================

function useChunkWorld(worldSeed, playerPos) {
  const [cities, setCities] = useState({});
  const [caves, setCaves] = useState({});
  const loadedChunksRef = useRef(new Set());
  const pendingRef = useRef(false); // guards against overlapping batch loads

  const loadChunk = useCallback((cx, cy) => {
    const ck = chunkKey(cx, cy);
    if (loadedChunksRef.current.has(ck)) return false;
    if (cx < 0 || cy < 0 || cx >= TOTAL_CHUNKS || cy >= TOTAL_CHUNKS) return false;
    loadedChunksRef.current.add(ck);

    setCities(prev => {
      const newCities = generateChunkCities(cx, cy, worldSeed, prev);
      if (Object.keys(newCities).length === 0) return prev;
      const merged = { ...prev, ...newCities };
      // Generate caves for this chunk with merged cities (now returns array)
      const cavesResult = generateChunkCaves(cx, cy, worldSeed, merged, {});
      if (cavesResult && cavesResult.length > 0) {
        setCaves(cavePrev => {
          const updated = { ...cavePrev };
          for (const caveObj of cavesResult) {
            updated[caveObj.key] = caveObj.cave;
          }
          return updated;
        });
      }
      return merged;
    });
    return true;
  }, [worldSeed]);

  // Generate initial chunks around spawn
  useEffect(() => {
    const pcx = Math.floor(playerPos.x / CHUNK_SIZE);
    const pcy = Math.floor(playerPos.y / CHUNK_SIZE);
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        loadChunk(pcx + dx, pcy + dy);
      }
    }
  }, []); // Only on mount

  // Progressively load chunks around player as they move
  useEffect(() => {
    const pcx = Math.floor(playerPos.x / CHUNK_SIZE);
    const pcy = Math.floor(playerPos.y / CHUNK_SIZE);
    const toLoad = [];
    // Load radius of 4 chunks around player
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const cx = pcx + dx, cy = pcy + dy;
        const ck = chunkKey(cx, cy);
        if (!loadedChunksRef.current.has(ck) && cx >= 0 && cy >= 0 && cx < TOTAL_CHUNKS && cy < TOTAL_CHUNKS) {
          toLoad.push([cx, cy]);
        }
      }
    }
    if (toLoad.length === 0 || pendingRef.current) return;

    // Load in background batches
    pendingRef.current = true;
    let idx = 0;
    const batch = () => {
      const batchSize = 4;
      for (let i = 0; i < batchSize && idx < toLoad.length; i++, idx++) {
        loadChunk(toLoad[idx][0], toLoad[idx][1]);
      }
      if (idx < toLoad.length) {
        setTimeout(batch, 0);
      } else {
        pendingRef.current = false;
      }
    };
    setTimeout(batch, 0);
  }, [playerPos.x, playerPos.y, loadChunk]);

  return { cities, caves };
}

// Helper function to find which biomes an enemy spawns in
function findBiomesForEnemy(enemyName) {
  const biomes = [];
  for (const [biome, enemies] of Object.entries(ENEMIES_BY_BIOME)) {
    if (enemies.some(e => e.name === enemyName)) {
      biomes.push(biome);
    }
  }
  return biomes;
}

// Helper function to format biome names nicely
function formatBiomeNames(biomes) {
  if (biomes.length === 0) return "";
  const formattedBiomes = biomes.map(b => {
    const biomeEmoji = BIOME_EMOJI[b] || "";
    const biomeName = b.charAt(0).toUpperCase() + b.slice(1);
    return `${biomeEmoji} ${biomeName}`;
  }).join(", ");
  return ` Found in: ${formattedBiomes}.`;
}

function generateQuestgiverQuests(itemLevel, cities, originCityName, chunkX, chunkY, acceptedChunkBossQuests, isInSameChunk = false, worldSeed = 0, regionName = "", completedQuestIds = new Set()) {
  // ✅ SEEDED RNG für deterministische Quests
  const rng = seededRandom(worldSeed + 99999 + (originCityName.length * 17) + (chunkX || 0) * 1337 + (chunkY || 0) * 7331);
  
  const tier = getDifficultyTier(itemLevel);
  const pool = QUEST_ITEMS_POOL[tier] || QUEST_ITEMS_POOL.Beginner;
  const enemyPool = ENEMY_NAMES_BY_DIFFICULTY[tier] || ENEMY_NAMES_BY_DIFFICULTY.Beginner;
  const count = Math.floor(rng() * 3) + 1;  // ✅ 1-3 with seeded RNG
  const quests = [];
  const usedTargets = new Set();

  // Gold/XP base scales with itemLevel (was hardcoded per diffIdx 0-4)
  const goldBase = Math.round(50 * Math.pow(1.45, (itemLevel - 1) / 9));
  const xpBase   = Math.round(60 * Math.pow(1.45, (itemLevel - 1) / 9));

  // Find valid target cities for deliver quests: same or next tier
  const nextTier = { Beginner: "Easy", Easy: "Intermediate", Intermediate: "Hard", Hard: "Expert", Expert: "Expert" }[tier];
  const targetCities = Object.values(cities || {}).filter(c =>
    c.name !== originCityName && (c.difficulty === tier || c.difficulty === nextTier)
  );

  const DELIVER_ITEMS = ["Sealed Letter", "Royal Package", "Merchant's Goods", "Sacred Relic", "Map Fragment", "Enchanted Scroll", "Rare Medicine", "Trade Agreement", "Forbidden Tome", "Golden Chalice"];

  // CHUNK BOSS HUNT QUEST — shown at every city in the region
  const bossQuestId = `chunk_boss_${chunkX}_${chunkY}`;
  const alreadyAccepted = !!acceptedChunkBossQuests?.[`chunk_${chunkX}_${chunkY}`];
  const alreadyCompleted = completedQuestIds.has(bossQuestId);
  if (chunkX !== undefined && chunkY !== undefined && !alreadyAccepted && !alreadyCompleted) {
    const regionLabel = regionName ? ` in ${regionName}` : "";
    quests.push({
      id: bossQuestId,
      type: "questgiver",
      questKind: "chunkBossHunt",
      title: `Defeat the Cave Guardian${regionLabel}!`,
      description: `Slay the powerful boss that dwells in the caves of this region. Their treasure is yours to claim.`,
      targetChunkX: chunkX,
      targetChunkY: chunkY,
      targetBosses: 1,
      bossKillCount: 0,
      goldReward: Math.round((goldBase + (goldBase + 125)) / 2 * 0.8),
      xpReward:   Math.round((xpBase   + (xpBase   + 150)) / 2 * 1.3),
      rewardLoot: "boss",
      accepted: false,
    });
  }

  for (let i = 0; i < count; i++) {
    const roll = rng();  // ✅ Seeded

    if (roll < 0.33 && targetCities.length > 0) {
      const targetCity = targetCities[Math.floor(rng() * targetCities.length)];  // ✅ Seeded pick
      const deliverItem = DELIVER_ITEMS[Math.floor(rng() * DELIVER_ITEMS.length)];  // ✅ Seeded pick
      quests.push({
        id: `qg_city_${originCityName}_deliver_${i}`,  // ✅ Deterministisch!
        type: "questgiver", questKind: "deliver",
        title: `Deliver ${deliverItem} to ${targetCity.name}`,
        description: `Bring a ${deliverItem} to ${targetCity.name} (${targetCity.x}, ${targetCity.y}). The recipient awaits your arrival.`,
        deliverItem, targetCity: targetCity.name,
        targetCityX: targetCity.x, targetCityY: targetCity.y,
        targetCount: 1,
        goldReward: Math.round((goldBase + 25 + (goldBase + 125)) / 2 * 0.8),
        xpReward:   Math.round((xpBase   + 25 + (xpBase   + 150)) / 2 * 1.3),
        accepted: false,
      });
    } else if (roll < 0.66) {
      const needed = Math.floor(rng() * 4) + 3;  // ✅ 3-6 seeded
      let target;
      do { target = enemyPool[Math.floor(rng() * enemyPool.length)]; } while (usedTargets.has(target));  // ✅ Seeded pick
      usedTargets.add(target);
      const biomes = findBiomesForEnemy(target);
      const biomeInfo = formatBiomeNames(biomes);
      quests.push({
        id: `qg_city_${originCityName}_kill_${i}`,  // ✅ Deterministisch!
        type: "questgiver", questKind: "kill",
        title: `Slay ${needed} ${target}s`,
        description: `The region is plagued by ${target}s. Defeat ${needed} of them to restore peace.${biomeInfo}`,
        targetEnemy: target, targetCount: needed, killCount: 0,
        goldReward: Math.round((goldBase + (goldBase + 75)) / 2 * 0.8),
        xpReward:   Math.round((xpBase   + (xpBase  + 100)) / 2 * 1.3),
        accepted: false,
      });
    } else {
      const needed = Math.floor(rng() * 2) + 3;  // ✅ 3-4 seeded
      let item;
      do { item = pool[Math.floor(rng() * pool.length)]; } while (usedTargets.has(item));  // ✅ Seeded pick
      usedTargets.add(item);
      quests.push({
        id: `qg_city_${originCityName}_gather_${i}`,  // ✅ Deterministisch!
        type: "questgiver", questKind: "gather",
        title: `Collect ${needed} ${item}s`,
        description: `A brave adventurer is needed to gather ${needed} ${item}s from the dangerous creatures nearby.`,
        targetItem: item, targetCount: needed,
        goldReward: Math.round((goldBase + (goldBase + 75)) / 2 * 0.8),
        xpReward:   Math.round((xpBase   + (xpBase  + 100)) / 2 * 1.3),
        accepted: false,
      });
    }
  }
  return quests;
}

function generateBulletinQuests(itemLevel, worldSeed = 0) {
  // ✅ SEEDED RNG für deterministische Quests
  const rng = seededRandom(worldSeed + 88888 + itemLevel * 121);
  
  const tier = getDifficultyTier(itemLevel);
  const pool = QUEST_ITEMS_POOL[tier] || QUEST_ITEMS_POOL.Beginner;
  const enemyPool = ENEMY_NAMES_BY_DIFFICULTY[tier] || ENEMY_NAMES_BY_DIFFICULTY.Beginner;
  const count = Math.floor(rng() * 2) + 2;  // ✅ 2-3 seeded
  const quests = [];

  const goldBase = Math.round(15 * Math.pow(1.75, (itemLevel - 1) / 9));
  // diffIdx equivalent for xpReward formula (0-4 maps to tier progression)
  const tierIdx = ["Beginner","Easy","Intermediate","Hard","Expert"].indexOf(tier);

  for (let i = 0; i < count; i++) {
    const isKill = rng() < 0.5;  // ✅ Seeded

    if (isKill) {
      const needed = Math.floor(rng() * 3) + 2;  // ✅ 2-4 seeded
      const target = enemyPool[Math.floor(rng() * enemyPool.length)];  // ✅ Seeded pick
      const biomes = findBiomesForEnemy(target);
      const biomeInfo = formatBiomeNames(biomes);
      quests.push({
        id: `bb_tier_${tier}_kill_${i}`,  // ✅ Deterministisch!
        type: "bulletin", questKind: "kill",
        title: `Hunt ${needed} ${target}s`,
        description: `Bounty posted: eliminate ${needed} ${target}${needed > 1 ? "s" : ""} in the surrounding area.${biomeInfo}`,
        targetEnemy: target, targetCount: needed, killCount: 0,
        goldReward: Math.round((goldBase + (goldBase + 50)) / 2 * 0.8),
        xpReward:   Math.round((10 + (30 + tierIdx * 10)) / 2 * 1.2),
        accepted: false,
      });
    } else {
      const needed = Math.floor(rng() * 2) + 1;  // ✅ 1-2 seeded
      const item = pool[Math.floor(rng() * pool.length)];  // ✅ Seeded pick
      quests.push({
        id: `bb_tier_${tier}_gather_${i}`,  // ✅ Deterministisch!
        type: "bulletin", questKind: "gather",
        title: `Gather ${needed} ${item}`,
        description: `The town needs ${needed} ${item}${needed > 1 ? "s" : ""} collected from nearby creatures.`,
        targetItem: item, targetCount: needed,
        goldReward: Math.round((goldBase + (goldBase + 50)) / 2 * 0.8),
        xpReward:   Math.round((10 + (30 + tierIdx * 10)) / 2 * 1.2),
        accepted: false,
      });
    }
  }
  return quests;
}

// Prozentuale Schadensreduktion durch Defense (asymptotisch, nie 100%)
// defense / (defense + 50) → bei defense=50: 50% Reduktion
function calcEnemyDamage(enemyAtk, defense) {
  const rawAtk = enemyAtk + randInt(-2, 2);
  const reduction = defense / (defense + 50);
  return Math.max(1, Math.round(rawAtk * (1 - reduction)));
}


function calcStats(attrs, equipment) {
  let bonusStr = 0, bonusDex = 0, bonusInt = 0, bonusEnd = 0;
  let bonusDmg = 0, bonusDef = 0;
  Object.values(equipment).forEach(item => {
    if (item) {
      bonusDmg += item.bonusDamage || 0;
      bonusDef += item.bonusDefense || 0;
      if (item.bonusStats) {
        bonusStr += item.bonusStats.strength || 0;
        bonusDex += item.bonusStats.dexterity || 0;
        bonusInt += item.bonusStats.intelligence || 0;
        bonusEnd += item.bonusStats.endurance || 0;
      }
    }
  });
  const str = (attrs.strength || 1) + bonusStr;
  const dex = (attrs.dexterity || 1) + bonusDex;
  const int = (attrs.intelligence || 1) + bonusInt;
  const end = (attrs.endurance || 1) + bonusEnd;
  return {
    maxHp: str * 5 + end * 8 + int * 4 + 30,
    maxMana: int * 4 + 10,
    damage: str + Math.floor(dex / 2) + bonusDmg,
    defense: Math.floor(str / 2) + Math.floor(dex / 2) + int * 0.5 + bonusDef,
    dodgeChance: Math.min(0.50, dex * 0.015),
    critChance: Math.min(0.50, dex * 0.012),
  };
}

// ============================================================
// STYLES
// ============================================================

const S = {
  app: { background: "#0a0e27", color: "#e8d7c3", fontFamily: "'Crimson Text', 'Georgia', serif", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "12px 12px 80px 12px", fontSize: 21, paddingBottom: "80px" },
  gold: { color: "#d4af37" },
  panel: { background: "rgba(20,25,50,0.9)", border: "1px solid #d4af3744", borderRadius: 10, padding: 16, marginBottom: 10 },
  btn: { background: "linear-gradient(180deg, #2a1f0e, #1a140a)", border: "1px solid #d4af37", color: "#d4af37", padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 21, fontWeight: 600, transition: "all 0.15s" },
  btnDisabled: { opacity: 0.4, cursor: "not-allowed" },
  btnDanger: { borderColor: "#ef4444", color: "#ef4444" },
  btnSuccess: { borderColor: "#4ade80", color: "#4ade80" },
  input: { background: "#0d1230", border: "1px solid #d4af3766", color: "#e8d7c3", padding: "10px 14px", borderRadius: 8, fontFamily: "inherit", fontSize: 21, outline: "none", width: "100%" },
  hpBar: { background: "#1a0000", borderRadius: 5, overflow: "hidden", height: 22, position: "relative", border: "1px solid #ef444466" },
  manaBar: { background: "#00001a", borderRadius: 5, overflow: "hidden", height: 18, position: "relative", border: "1px solid #4169E166" },
  badge: (color) => ({ background: color + "22", color, border: `1px solid ${color}55`, borderRadius: 5, padding: "5px 12px", fontSize: 21, fontWeight: 600 }),
};

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Crimson+Text:wght@400;600;700&display=swap');
    
    @keyframes floatUp {
      0% {
        opacity: 1;
        transform: translate(-50%, 0);
      }
      100% {
        opacity: 0;
        transform: translate(-50%, -60px);
      }
    }
    
    button:not(:disabled):hover {
      filter: brightness(1.3);
      box-shadow: 0 0 8px #d4af3733;
    }
    button:not(:disabled):active {
      transform: scale(0.94);
      filter: brightness(0.8);
      box-shadow: 0 0 2px #d4af3722 inset;
      transition: all 0.05s;
    }
  `}</style>
);

// ============================================================
// COMPONENTS
// ============================================================

// Inject pulse keyframe once
if (typeof document !== "undefined" && !document.getElementById("hp-pulse-style")) {
  const st = document.createElement("style");
  st.id = "hp-pulse-style";
  st.textContent = `
    @keyframes hpPulse {
      0%,100% { opacity: 1; box-shadow: 0 0 4px #ef4444; }
      50%      { opacity: 0.55; box-shadow: 0 0 14px #ef4444, 0 0 24px #ef444488; }
    }
  `;
  document.head.appendChild(st);
}

function HealthBar({ current, max, label, isMana, pulse }) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  const isLow = !isMana && pct <= 25;
  const barColor = isMana ? "#4169E1" : pct > 50 ? "#22c55e" : pct > 25 ? "#eab308" : "#ef4444";
  return (
    <div style={{ marginBottom: 5 }}>
      {label && <div style={{ fontSize: 17, marginBottom: 3, opacity: 0.7 }}>{label}</div>}
      <div style={isMana ? S.manaBar : S.hpBar}>
        <div style={{
          width: `${pct}%`, height: "100%", background: barColor,
          transition: "width 0.3s", borderRadius: 5,
          ...(pulse && isLow ? { animation: "hpPulse 1s ease-in-out infinite" } : {}),
        }} />
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 700, color: "#fff", textShadow: "0 0 4px #000" }}>
          {current}/{max}
        </div>
      </div>
    </div>
  );
}

const STAT_TOOLTIPS = {
  strength: "+5 Max HP per point\n+1 Damage per point\n+0.5 Defense per point",
  dexterity: "+0.5 Damage per point\n+0.5 Defense per point\n+1.5% Dodge per point (max 50%)\n+1.2% Crit per point (max 50%)",
  intelligence: "+4 Max Mana per point\n+4 Max HP per point\n+0.5 Defense per point",
  endurance: "+8 Max HP per point",
};

function StatRow({ statKey, val, statPoints, onAdd }) {
  const [hov, setHov] = useState(false);
  return (
    <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#ffffff06", padding: "8px 12px", borderRadius: 6, border: "1px solid #d4af3711" }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
    >
      <span style={{ textTransform: "capitalize", fontSize: 16, cursor: "help" }}>{statKey}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ color: "#d4af37", fontWeight: 700, fontSize: 16 }}>{val}</span>
        {statPoints > 0 && (
          <button onClick={onAdd} style={{ ...S.btn, ...S.btnSuccess, padding: "2px 8px", fontSize: 14, lineHeight: 1 }}>+</button>
        )}
      </div>
      {hov && STAT_TOOLTIPS[statKey] && (
        <div style={{
          position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)",
          marginBottom: 6, padding: "8px 12px", borderRadius: 8, fontSize: 13, lineHeight: 1.5,
          background: "rgba(5,8,25,0.97)", border: "1px solid #d4af3755",
          boxShadow: "0 4px 16px #000a", whiteSpace: "pre-line", zIndex: 1200,
          pointerEvents: "none", textAlign: "left", minWidth: 200,
        }}>
          <div style={{ fontWeight: 700, color: "#d4af37", marginBottom: 3, textTransform: "capitalize" }}>{statKey}</div>
          {STAT_TOOLTIPS[statKey].split("\n").map((line, i) => (
            <div key={i} style={{ color: "#4ade80" }}>{line}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// Hero sprite loader (same black-removal as monsters)
let _heroCanvas = null;
let _heroLoading = false;
let _heroCallbacks = [];

function loadHeroSprite(src, onReady) {
  if (_heroCanvas) { onReady(_heroCanvas); return; }
  _heroCallbacks.push(onReady);
  if (_heroLoading) return;
  _heroLoading = true;
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    const c = document.createElement("canvas");
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const id = ctx.getImageData(0, 0, c.width, c.height);
    const d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const brightness = d[i] + d[i+1] + d[i+2];
      if (brightness < 35) { d[i+3] = 0; }
      else if (brightness < 70) { d[i+3] = Math.min(255, (brightness - 35) * 7); }
    }
    ctx.putImageData(id, 0, 0);
    _heroCanvas = c;
    _heroCallbacks.forEach(cb => cb(c));
    _heroCallbacks = [];
  };
  img.src = src;
}

function HeroImage({ size = 110, heroUrl }) {
  const canvasRef = useRef(null);
  const [loaded, setLoaded] = useState(!!_heroCanvas);

  useEffect(() => {
    loadHeroSprite(heroUrl, (sheet) => {
      setLoaded(true);
      if (!canvasRef.current) return;
      const ctx = canvasRef.current.getContext("2d");
      
      // Berechne Aspect Ratio des Original-Bildes
      const aspectRatio = sheet.width / sheet.height;
      let drawWidth = size;
      let drawHeight = size;
      let offsetX = 0;
      let offsetY = 0;
      
      if (aspectRatio > 1) {
        // Breiter als hoch
        drawHeight = size / aspectRatio;
        offsetY = (size - drawHeight) / 2;
      } else {
        // Höher als breit
        drawWidth = size * aspectRatio;
        offsetX = (size - drawWidth) / 2;
      }
      
      canvasRef.current.width = size;
      canvasRef.current.height = size;
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(sheet, 0, 0, sheet.width, sheet.height, offsetX, offsetY, drawWidth, drawHeight);
    });
  }, [size, heroUrl]);

  useEffect(() => {
    if (!loaded || !_heroCanvas || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    
    // Berechne Aspect Ratio des Original-Bildes
    const aspectRatio = _heroCanvas.width / _heroCanvas.height;
    let drawWidth = size;
    let drawHeight = size;
    let offsetX = 0;
    let offsetY = 0;
    
    if (aspectRatio > 1) {
      // Breiter als hoch
      drawHeight = size / aspectRatio;
      offsetY = (size - drawHeight) / 2;
    } else {
      // Höher als breit
      drawWidth = size * aspectRatio;
      offsetX = (size - drawWidth) / 2;
    }
    
    canvasRef.current.width = size;
    canvasRef.current.height = size;
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(_heroCanvas, 0, 0, _heroCanvas.width, _heroCanvas.height, offsetX, offsetY, drawWidth, drawHeight);
  }, [loaded, size]);

  return <canvas ref={canvasRef} width={size} height={size} style={{ width: size, height: size }} />;
}

// Spritesheet loader: loads image, removes black background, caches as canvas
let _spriteCanvas = null;
let _spriteLoading = false;
let _spriteCallbacks = [];

function loadSpritesheet(src, onReady) {
  if (_spriteCanvas) { onReady(_spriteCanvas); return; }
  _spriteCallbacks.push(onReady);
  if (_spriteLoading) return;
  _spriteLoading = true;
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    const c = document.createElement("canvas");
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0);
    // Remove black background → transparent
    const id = ctx.getImageData(0, 0, c.width, c.height);
    const d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const brightness = d[i] + d[i+1] + d[i+2];
      if (brightness < 35) { d[i+3] = 0; }
      else if (brightness < 70) { d[i+3] = Math.min(255, (brightness - 35) * 7); }
    }
    ctx.putImageData(id, 0, 0);
    _spriteCanvas = c;
    _spriteCallbacks.forEach(cb => cb(c));
    _spriteCallbacks = [];
  };
  img.onerror = () => { _spriteLoading = false; };
  img.src = src;
}

function SpriteImage({ spriteKey, size = 80, spriteSheetUrl }) {
  const canvasRef = useRef(null);
  const [loaded, setLoaded] = useState(!!_spriteCanvas);

  useEffect(() => {
    loadSpritesheet(spriteSheetUrl, (sheet) => {
      setLoaded(true);
      if (!canvasRef.current) return;
      const ctx = canvasRef.current.getContext("2d");
      const pos = SPRITE_MAP[spriteKey];
      if (!pos) return;
      const { x, y, w, h } = pos;  // ← Pixel positions!
      canvasRef.current.width = size;
      canvasRef.current.height = size;
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(sheet, x, y, w, h, 0, 0, size, size);  // ← Use x, y, w, h directly
    });
  }, [spriteKey, size, spriteSheetUrl]);

  useEffect(() => {
    if (!loaded || !_spriteCanvas || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    const pos = SPRITE_MAP[spriteKey];
    if (!pos) return;
    const { x, y, w, h } = pos;  // ← Pixel positions!
    canvasRef.current.width = size;
    canvasRef.current.height = size;
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(_spriteCanvas, x, y, w, h, 0, 0, size, size);  // ← Use x, y, w, h directly
  }, [loaded, spriteKey, size]);

  return <canvas ref={canvasRef} width={size} height={size} style={{ width: size, height: size, imageRendering: "pixelated" }} />;
}

function EquipSlot({ slot, item, icon, svgIcon }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{
        width: 105, height: 105, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        background: item ? "#ffffff08" : "#ffffff03", borderRadius: 10,
        border: item ? `1px solid ${(item.rarityColor || "#d4af37") + "44"}` : "1px dashed #ffffff22",
        cursor: "default", transition: "border-color 0.2s",
        ...(hovered && item ? { borderColor: item.rarityColor || "#d4af37" } : {}),
      }}>
        <span style={{ fontSize: 32 }}>{svgIcon ? svgIcon : icon}</span>
        <div style={{ fontSize: 13, opacity: 0.4, textTransform: "capitalize", marginTop: 3 }}>{slot}</div>
        <div style={{ fontSize: 13, fontWeight: item ? 600 : 400, opacity: item ? 0.9 : 0.25, textAlign: "center", lineHeight: "1.2", padding: "0 4px", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: item ? (item.rarityColor || "#ccc") : undefined }}>
          {item ? item.name : "Empty"}
        </div>
      </div>
      {hovered && item && (
        <div style={{
          position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)",
          marginBottom: 8, padding: "10px 14px", borderRadius: 8, fontSize: 15,
          background: "rgba(5,8,25,0.97)", border: "1px solid #d4af3766",
          boxShadow: "0 4px 16px #000a", whiteSpace: "nowrap", zIndex: 1200,
          pointerEvents: "none",
        }}>
          <div style={{ fontWeight: 700, color: item.rarityColor || "#d4af37", marginBottom: 5, fontSize: 16 }}>{item.name}</div>
          <div style={{ opacity: 0.6, marginBottom: 5 }}>
            <span style={{ color: item.rarityColor || "#ccc", fontWeight: 600 }}>{item.rarity || "Normal"}</span>
            {" • "}<span style={{ textTransform: "capitalize" }}>{item.slot}</span>
            {item.itemLevel && <><span>{" • "}</span><span style={{ color: "#d4af37" }}>Lvl {item.itemLevel}</span></>}
          </div>
          {item.bonusDamage > 0 && <div style={{ color: "#ef4444", fontWeight: 600 }}>+{item.bonusDamage} Damage</div>}
          {item.bonusDefense > 0 && <div style={{ color: "#60a5fa", fontWeight: 600 }}>+{item.bonusDefense} Defense</div>}
          {item.bonusStats && Object.entries(item.bonusStats).map(([stat, val]) => (
            <div key={stat} style={{ color: "#4ade80", fontWeight: 600 }}>+{val} {stat.charAt(0).toUpperCase() + stat.slice(1)}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function InventoryRow({ item, count, idx, onUse, onEquip, onSell, onDiscard, sellValue, canSell }) {
  const [hov, setHov] = useState(false);
  return (
    <div style={{ position: "relative" }}
      onMouseEnter={() => item.type === "armor" && setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #d4af3711" }}>
        <div>
          <span style={{ fontSize: 17, fontWeight: 600, color: item.rarityColor || undefined }}>{item.name}</span>
          {count > 1 && <span style={{ fontSize: 15, fontWeight: 700, ...S.gold, marginLeft: 6 }}>×{count}</span>}
          <span style={{ fontSize: 15, opacity: 0.5, marginLeft: 6 }}>
            {item.type === "consumable" ? (item.effect === "repel" ? `Consumable • ${item.value} steps no encounters` : `Consumable • ${item.healPercent ? `+${Math.round(item.healPercent * 100)}% HP` : `+${item.value} HP`}`) : item.type === "armor" ? (
              `${item.rarity || "Normal"} • ${item.slot.charAt(0).toUpperCase() + item.slot.slice(1)}`
            ) : item.type === "deliveryitem" ? "📬 Delivery" : "Quest Item"}
          </span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {item.type === "consumable" && <button onClick={onUse} style={{ ...S.btn, ...S.btnSuccess, padding: "6px 12px", fontSize: 17 }}>Use</button>}
          {item.type === "armor" && <button onClick={onEquip} style={{ ...S.btn, padding: "6px 12px", fontSize: 17 }}>Equip</button>}
          {canSell && item.type !== "questitem" && item.type !== "deliveryitem" && <button onClick={onSell} style={{ ...S.btn, padding: "6px 12px", fontSize: 17 }}>Sell {sellValue}g</button>}
          <button onClick={onDiscard} style={{ ...S.btn, ...S.btnDanger, padding: "6px 12px", fontSize: 17 }}>🗑️</button>
        </div>
      </div>
      {hov && item.type === "armor" && (
        <div style={{
          position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)",
          marginBottom: 6, padding: "10px 14px", borderRadius: 8, fontSize: 14,
          background: "rgba(5,8,25,0.97)", border: `1px solid ${(item.rarityColor || "#d4af37") + "66"}`,
          boxShadow: "0 4px 16px #000a", whiteSpace: "nowrap", zIndex: 1200,
          pointerEvents: "none",
        }}>
          <div style={{ fontWeight: 700, color: item.rarityColor || "#d4af37", marginBottom: 4, fontSize: 15 }}>{item.name}</div>
          <div style={{ opacity: 0.6, marginBottom: 4 }}>
            <span style={{ color: item.rarityColor || "#ccc", fontWeight: 600 }}>{item.rarity || "Normal"}</span>
            {" • "}<span style={{ textTransform: "capitalize" }}>{item.slot}</span>
          </div>
          {item.bonusDamage > 0 && <div style={{ color: "#ef4444", fontWeight: 600 }}>+{item.bonusDamage} Damage</div>}
          {item.bonusDefense > 0 && <div style={{ color: "#60a5fa", fontWeight: 600 }}>+{item.bonusDefense} Defense</div>}
          {item.bonusStats && Object.entries(item.bonusStats).map(([stat, val]) => (
            <div key={stat} style={{ color: "#4ade80", fontWeight: 600 }}>+{val} {stat.charAt(0).toUpperCase() + stat.slice(1)}</div>
          ))}
        </div>
      )}
    </div>
  );
}

const DEATH_STORIES = [
  (e, p) => `The ${e} let out a triumphant roar as ${p} crumpled to the ground. With a final, devastating blow, the creature stood victorious over the fallen adventurer.`,
  (e, p) => `${p} fought valiantly, but the ${e} was simply too powerful. As darkness crept into the edges of vision, the last thing ${p} saw was the ${e} towering above.`,
  (e, p) => `With a swift strike, the ${e} sent ${p} sprawling. The world went dark as the adventurer's strength gave out, defeated but not destroyed.`,
  (e, p) => `The battle was fierce, but the ${e} gained the upper hand. ${p} fell to one knee, then collapsed as the creature's relentless assault proved too much to bear.`,
  (e, p) => `${p} underestimated the ${e}'s ferocity. A crushing blow knocked the adventurer senseless, and the world faded to black.`,
  (e, p) => `The ${e} proved to be a formidable foe. As ${p}'s defenses crumbled, a final strike sent the adventurer into unconsciousness.`,
];

function getDeathStory(enemyName, playerName) {
  return DEATH_STORIES[Math.floor(Math.random() * DEATH_STORIES.length)](enemyName, playerName);
}

// ============================================================
// CHARACTER CREATION
// ============================================================

function CharacterCreation({ onStart }) {
  const [name, setName] = useState("");
  const [attrs, setAttrs] = useState(() => {
    const a = { strength: 1, dexterity: 1, intelligence: 1, endurance: 1 };
    let remaining = 6;
    const keys = Object.keys(a);
    while (remaining > 0) {
      const k = keys[Math.floor(Math.random() * keys.length)];
      if (a[k] < 10) { a[k]++; remaining--; }
    }
    return a;
  });
  const [showInfo, setShowInfo] = useState(null);

  const total = Object.values(attrs).reduce((s, v) => s + v, 0);
  const remaining = 10 - total;
  const stats = calcStats(attrs, {});
  const canStart = name.trim().length > 0 && total === 10;

  const adjust = (key, delta) => {
    setAttrs(prev => {
      const nv = prev[key] + delta;
      const newTotal = total + delta;
      if (nv < 1 || nv > 10 || newTotal > 10 || newTotal < 4) return prev;
      return { ...prev, [key]: nv };
    });
  };


  return (
    <div style={{ ...S.app, justifyContent: "center", padding: 20 }}>
      <div style={{ maxWidth: 540, width: "100%" }}>
        <h1 style={{ ...S.gold, textAlign: "center", fontSize: 38, marginBottom: 4, letterSpacing: 2, textShadow: "0 0 20px #d4af3744" }}>⚔️ Realm of Shadows</h1>
        <p style={{ textAlign: "center", opacity: 0.6, marginBottom: 24, fontSize: 21 }}>Create Your Hero</p>

        <div style={S.panel}>
          <label style={{ fontSize: 21, opacity: 0.6, textTransform: "uppercase", letterSpacing: 1 }}>Character Name</label>
          <input style={{ ...S.input, marginTop: 4 }} value={name} onChange={e => setName(e.target.value)} placeholder="Enter name..." maxLength={20} />
        </div>

        <div style={S.panel}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 21, opacity: 0.6, textTransform: "uppercase", letterSpacing: 1 }}>Attributes</span>
            <span style={{ ...S.gold, fontSize: 17 }}>Points: {remaining}</span>
          </div>

          {Object.entries(attrs).map(([key, val]) => (
            <div key={key} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ textTransform: "capitalize", fontSize: 17, fontWeight: 600 }}>{key}</span>
                  <button onClick={() => setShowInfo(showInfo === key ? null : key)} style={{ background: "none", border: "none", color: "#d4af37", cursor: "pointer", fontSize: 21, padding: 0 }}>ℹ️</button>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button onClick={() => adjust(key, -1)} style={{ ...S.btn, padding: "6px 14px", fontSize: 21 }}>−</button>
                  <span style={{ ...S.gold, fontSize: 21, fontWeight: 700, minWidth: 24, textAlign: "center" }}>{val}</span>
                  <button onClick={() => adjust(key, 1)} style={{ ...S.btn, padding: "6px 14px", fontSize: 21, ...(remaining <= 0 || val >= 10 ? S.btnDisabled : {}) }}>+</button>
                </div>
              </div>
              {showInfo === key && <div style={{ background: "#0d1230", padding: 8, borderRadius: 4, fontSize: 21, marginTop: 4, opacity: 0.8 }}>{STAT_TOOLTIPS[key]}</div>}
            </div>
          ))}
        </div>

        <div style={S.panel}>
          <div style={{ fontSize: 21, opacity: 0.6, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Stats Preview</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#ef4444", fontSize: 21, fontWeight: 700 }}>{stats.maxHp}</div>
              <div style={{ fontSize: 17, opacity: 0.5 }}>Max HP</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#4169E1", fontSize: 21, fontWeight: 700 }}>{stats.maxMana}</div>
              <div style={{ fontSize: 17, opacity: 0.5 }}>Max Mana</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#d4af37", fontSize: 21, fontWeight: 700 }}>{stats.damage}</div>
              <div style={{ fontSize: 17, opacity: 0.5 }}>Damage</div>
            </div>
          </div>
        </div>

        <button onClick={() => canStart && onStart(name.trim(), attrs)} style={{ ...S.btn, width: "100%", fontSize: 21, padding: 12, ...(canStart ? {} : S.btnDisabled) }}>
          ⚔️ Begin Adventure
        </button>
      </div>
    </div>
  );
}

// ============================================================
// SKILL BUTTON COMPONENTS (must be outside Game to avoid hook-in-map error)
// ============================================================

function SpellButton({ spell, mana, maxMana, damage, onCast, disabled }) {
  const [tooltip, setTooltip] = React.useState(null);
  const [tooltipPos, setTooltipPos] = React.useState({ x: 0, y: 0 });
  const canCast = mana >= spell.manaCost;
  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => onCast(spell.id)}
        onMouseEnter={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setTooltip(true);
          setTooltipPos({ x: rect.right + 8, y: rect.top });
        }}
        onMouseLeave={() => setTooltip(null)}
        style={{
          width: "100%", aspectRatio: "1", padding: 0,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
          fontSize: 24,
          background: canCast ? "#0066ff22" : "#66666633",
          border: canCast ? "1px solid #4169E1" : "1px solid #666",
          borderRadius: 6,
          color: canCast ? "#4169E1" : "#666",
          cursor: canCast ? "pointer" : "not-allowed",
          opacity: canCast ? 1 : 0.5,
          transition: "all 0.2s",
        }}
        disabled={!canCast || disabled}
      >
        {spell.name.split(" ")[0]}
        <div style={{ fontSize: 10, fontWeight: 600, textAlign: "center", maxWidth: "100%" }}>
          {spell.name.split(" ").slice(1).join(" ")}
        </div>
      </button>
      {tooltip && (
        <div style={{
          position: "fixed", left: tooltipPos.x, top: tooltipPos.y,
          background: "#1a1a2e", border: "1px solid #4169E1", borderRadius: 8,
          padding: 10, fontSize: 12, minWidth: 200, color: "#fff", zIndex: 10000, pointerEvents: "none",
        }}>
          <div style={{ fontWeight: 700, color: "#4169E1", marginBottom: 6 }}>{spell.name}</div>
          <div style={{ opacity: 0.8, marginBottom: 4 }}>💚 Mana Cost: <span style={{ color: "#4169E1", fontWeight: 600 }}>{spell.manaCost}</span></div>
          <div style={{ opacity: 0.8, marginBottom: 4 }}>⚔️ Damage: <span style={{ color: "#ff8800", fontWeight: 600 }}>{spell.dmgRange[0]}-{spell.dmgRange[1]}</span></div>
          {spell.effect && (
            <div style={{ opacity: 0.8, marginBottom: 4 }}>
              ✨ Effect: <span style={{ color: "#4ade80", fontWeight: 600 }}>
                {spell.effect === "slow" ? `Slow: -50% enemy dmg (${spell.slowDuration} rounds)` :
                 spell.effect === "heal" ? `Lifesteal: ${Math.round(spell.healPercent * 100)}% of damage dealt` :
                 spell.effect === "dodge" ? "Stealth: enemy misses next 2 attacks" :
                 spell.effect === "burn" ? `Burn: enemy loses HP each round (${spell.burnDuration} rounds)` :
                 spell.effect === "playerHeal" ? "Heals you for the rolled amount" :
                 spell.effect}
              </span>
            </div>
          )}
          {spell.hitCount && (
            <div style={{ opacity: 0.8, marginBottom: 4 }}>
              🎯 Hits: <span style={{ color: "#ff8800", fontWeight: 600 }}>{spell.hitCount}</span>
            </div>
          )}
          <div style={{ opacity: 0.6, fontSize: 11, marginTop: 6, paddingTop: 6, borderTop: "1px solid #4169E122" }}>
            Current Mana: {mana}/{maxMana}
          </div>
        </div>
      )}
    </div>
  );
}

function SpecialButton({ special, hp, maxHp, onUse, disabled }) {
  const [tooltip, setTooltip] = React.useState(null);
  const [tooltipPos, setTooltipPos] = React.useState({ x: 0, y: 0 });
  const hpCost = Math.ceil(hp * special.hpCostPercent);
  const canUse = hp - hpCost > 1;
  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => onUse(special.id)}
        onMouseEnter={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setTooltip(true);
          setTooltipPos({ x: rect.right + 8, y: rect.top });
        }}
        onMouseLeave={() => setTooltip(null)}
        style={{
          width: "100%", aspectRatio: "1", padding: 0,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
          fontSize: 24,
          background: canUse ? "#ff660022" : "#66666633",
          border: canUse ? "1px solid #ff8800" : "1px solid #666",
          borderRadius: 6,
          color: canUse ? "#ff8800" : "#666",
          cursor: canUse ? "pointer" : "not-allowed",
          opacity: canUse ? 1 : 0.5,
          transition: "all 0.2s",
        }}
        disabled={!canUse || disabled}
      >
        {special.name.split(" ")[0]}
        <div style={{ fontSize: 10, fontWeight: 600, textAlign: "center", maxWidth: "100%" }}>
          {special.name.split(" ").slice(1).join(" ")}
        </div>
      </button>
      {tooltip && (
        <div style={{
          position: "fixed", left: tooltipPos.x, top: tooltipPos.y,
          background: "#1a1a2e", border: "1px solid #ff8800", borderRadius: 8,
          padding: 10, fontSize: 12, minWidth: 200, color: "#fff", zIndex: 10000, pointerEvents: "none",
        }}>
          <div style={{ fontWeight: 700, color: "#ff8800", marginBottom: 6 }}>{special.name}</div>
          <div style={{ opacity: 0.8, marginBottom: 4 }}>❤️ HP Cost: <span style={{ color: "#ff8800", fontWeight: 600 }}>{Math.round(special.hpCostPercent * 100)}% ({hpCost})</span></div>
          <div style={{ opacity: 0.8, marginBottom: 4 }}>⚔️ Damage: <span style={{ color: "#ff8800", fontWeight: 600 }}>{special.dmgRange[0]}-{special.dmgRange[1]}</span></div>
          {special.effect && (
            <div style={{ opacity: 0.8, marginBottom: 4 }}>
              ✨ Effect: <span style={{ color: "#ff8800", fontWeight: 600 }}>
                {special.effect === "bleed" ? `Bleed: enemy loses HP each round (${special.bleedDuration} rounds)` :
                 special.effect === "crit" ? "Crit Boost: next 2 attacks guaranteed crit" :
                 special.effect === "defense" ? "Defense Boost: +50% defense for 2 rounds" :
                 special.effect === "poison" ? `Poison: enemy loses HP each round (${special.poisonDuration} rounds)` :
                 special.effect === "heal" ? `Lifesteal: ${Math.round(special.healPercent * 100)}% of damage dealt` :
                 special.effect === "reflect" ? "Deal damage (no extra effect)" :
                 special.effect === "stun" ? `Stun: enemy can't attack for ${special.stunDuration} rounds` :
                 special.effect}
              </span>
            </div>
          )}
          {special.hitCount && (
            <div style={{ opacity: 0.8, marginBottom: 4 }}>
              🎯 Hits: <span style={{ color: "#ff8800", fontWeight: 600 }}>{special.hitCount}</span>
            </div>
          )}
          <div style={{ opacity: 0.6, fontSize: 11, marginTop: 6, paddingTop: 6, borderTop: "1px solid #ff880022" }}>
            Current HP: {hp}/{maxHp}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// MAIN GAME
// ============================================================

function CastleSVG({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 170 230" fill="none" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <rect x="20" y="110" width="130" height="115" fill="#1a1a2e" stroke="#5a5a8a" strokeWidth="1.2"/>
      <line x1="20" y1="130" x2="150" y2="130" stroke="#2a2a4a" strokeWidth="0.8"/>
      <line x1="20" y1="152" x2="150" y2="152" stroke="#2a2a4a" strokeWidth="0.8"/>
      <line x1="20" y1="174" x2="150" y2="174" stroke="#2a2a4a" strokeWidth="0.8"/>
      <rect x="10" y="85" width="38" height="140" fill="#1a1a2e" stroke="#5a5a8a" strokeWidth="1.2"/>
      <rect x="10" y="72" width="10" height="16" fill="#1a1a2e" stroke="#5a5a8a" strokeWidth="1"/>
      <rect x="24" y="72" width="10" height="16" fill="#1a1a2e" stroke="#5a5a8a" strokeWidth="1"/>
      <rect x="14" y="105" width="10" height="14" rx="5" fill="#0a0a14" stroke="#3a3a5a" strokeWidth="0.8"/>
      <rect x="15" y="106" width="8" height="12" rx="4" fill="#d4af37" opacity="0.6"/>
      <rect x="122" y="85" width="38" height="140" fill="#1a1a2e" stroke="#5a5a8a" strokeWidth="1.2"/>
      <rect x="126" y="72" width="10" height="16" fill="#1a1a2e" stroke="#5a5a8a" strokeWidth="1"/>
      <rect x="140" y="72" width="10" height="16" fill="#1a1a2e" stroke="#5a5a8a" strokeWidth="1"/>
      <rect x="146" y="105" width="10" height="14" rx="5" fill="#0a0a14" stroke="#3a3a5a" strokeWidth="0.8"/>
      <rect x="58" y="55" width="54" height="170" fill="#1a1a2e" stroke="#5a5a8a" strokeWidth="1.2"/>
      <rect x="58" y="40" width="12" height="18" fill="#1a1a2e" stroke="#5a5a8a" strokeWidth="1"/>
      <rect x="76" y="40" width="12" height="18" fill="#1a1a2e" stroke="#5a5a8a" strokeWidth="1"/>
      <rect x="94" y="40" width="12" height="18" fill="#1a1a2e" stroke="#5a5a8a" strokeWidth="1"/>
      <rect x="73" y="78" width="24" height="28" rx="12" fill="#0a0a14" stroke="#3a3a5a" strokeWidth="0.8"/>
      <rect x="74" y="79" width="22" height="26" rx="11" fill="#d4af37" opacity="0.6"/>
      <rect x="73" y="118" width="24" height="28" rx="12" fill="#0a0a14" stroke="#3a3a5a" strokeWidth="0.8"/>
      <rect x="73" y="168" width="24" height="57" fill="#080810"/>
      <path d="M73,188 Q73,168 85,168 Q97,168 97,188" fill="#080810" stroke="#3a3a5a" strokeWidth="0.8"/>
      <line x1="79" y1="170" x2="79" y2="225" stroke="#2a2a3a" strokeWidth="1"/>
      <line x1="85" y1="170" x2="85" y2="225" stroke="#2a2a3a" strokeWidth="1"/>
      <line x1="91" y1="170" x2="91" y2="225" stroke="#2a2a3a" strokeWidth="1"/>
      <line x1="73" y1="190" x2="97" y2="190" stroke="#2a2a3a" strokeWidth="1"/>
      <line x1="73" y1="208" x2="97" y2="208" stroke="#2a2a3a" strokeWidth="1"/>
      <line x1="85" y1="5" x2="85" y2="42" stroke="#4a4a6a" strokeWidth="1.2"/>
      <polygon points="85,5 85,22 100,13" fill="#8b1a1a"/>
    </svg>
  );
}

function CaveSVG({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <ellipse cx="50" cy="72" rx="48" ry="28" fill="#1a1a2e" stroke="#4a4a6a" strokeWidth="1.2"/>
      <ellipse cx="50" cy="65" rx="46" ry="34" fill="#1a1a2e" stroke="#4a4a6a" strokeWidth="1"/>
      <ellipse cx="38" cy="55" rx="30" ry="26" fill="#1a1a2e" stroke="#4a4a6a" strokeWidth="0.8"/>
      <ellipse cx="62" cy="52" rx="28" ry="24" fill="#1a1a2e" stroke="#4a4a6a" strokeWidth="0.8"/>
      <ellipse cx="50" cy="76" rx="22" ry="16" fill="#080810"/>
      <path d="M28,76 Q28,56 50,53 Q72,56 72,76" fill="#080810"/>
      <ellipse cx="50" cy="78" rx="18" ry="12" fill="#030308"/>
      <polygon points="36,56 39,70 42,56" fill="#141428"/>
      <polygon points="46,53 49,68 52,53" fill="#141428"/>
      <polygon points="56,54 59,69 62,54" fill="#141428"/>
      <ellipse cx="50" cy="80" rx="12" ry="6" fill="#8b0000" opacity="0.3"/>
      <line x1="10" y1="68" x2="20" y2="60" stroke="#2a2a4a" strokeWidth="0.8"/>
      <line x1="76" y1="62" x2="88" y2="70" stroke="#2a2a4a" strokeWidth="0.8"/>
    </svg>
  );
}

function WeaponSVG({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" style={{ display:"inline-block", verticalAlign:"middle" }}>
      <g transform="translate(32,32) rotate(-45)">
        <path d="M0,-24 L3,-5 L0,0 L-3,-5 Z" fill="#c8d0dc" stroke="#8890a0" strokeWidth="0.8"/>
        <path d="M0,-24 L0.8,-5 L0,0 L-0.8,-5 Z" fill="#e8ecf2"/>
        <path d="M-8,-5 L-2,-6 L0,-5 L2,-6 L8,-5 L6,-3 L0,-4 L-6,-3 Z" fill="#d4af37" stroke="#a07a10" strokeWidth="0.6"/>
        <rect x="-2" y="-3" width="4" height="10" rx="1" fill="#3a1a0a" stroke="#5a3a1a" strokeWidth="0.5"/>
        <line x1="-2" y1="-1" x2="2" y2="-1" stroke="#8b6a3e" strokeWidth="0.8"/>
        <line x1="-2" y1="2" x2="2" y2="2" stroke="#8b6a3e" strokeWidth="0.8"/>
        <line x1="-2" y1="5" x2="2" y2="5" stroke="#8b6a3e" strokeWidth="0.8"/>
        <ellipse cx="0" cy="9" rx="3.5" ry="2.5" fill="#d4af37" stroke="#a07a10" strokeWidth="0.8"/>
      </g>
    </svg>
  );
}

function ShieldSVG({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" style={{ display:"inline-block", verticalAlign:"middle" }}>
      <path d="M32 6 L54 16 L54 34 Q54 52 32 60 Q10 52 10 34 L10 16 Z" fill="#1a1a3e" stroke="#5a5a9a" strokeWidth="2"/>
      <path d="M32 12 L48 20 L48 34 Q48 48 32 55 Q16 48 16 34 L16 20 Z" fill="#2a2a5a" stroke="#4a4a8a" strokeWidth="1"/>
      <line x1="32" y1="14" x2="32" y2="54" stroke="#d4af37" strokeWidth="2"/>
      <line x1="16" y1="30" x2="48" y2="30" stroke="#d4af37" strokeWidth="2"/>
      <path d="M32 20 L35 28 L32 25 L29 28 Z" fill="#d4af37"/>
    </svg>
  );
}

function HelmSVG({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" style={{ display:"inline-block", verticalAlign:"middle" }}>
      <path d="M16 38 Q16 14 32 10 Q48 14 48 38 L48 44 C48 48 16 48 16 44 Z" fill="#2a2a3e" stroke="#5a5a8a" strokeWidth="1.5"/>
      <rect x="20" y="28" width="24" height="5" rx="2" fill="#0a0a14"/>
      <path d="M32 10 Q36 2 40 4 Q36 10 32 10Z" fill="#8b0000"/>
      <path d="M32 10 Q38 4 44 6 Q40 12 36 14" fill="none" stroke="#8b0000" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="16" y1="36" x2="48" y2="36" stroke="#d4af37" strokeWidth="0.8" opacity="0.6"/>
      <rect x="22" y="44" width="20" height="5" rx="2" fill="#3a3a5a" stroke="#5a5a8a" strokeWidth="0.8"/>
    </svg>
  );
}

function ChestSVG({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" style={{ display:"inline-block", verticalAlign:"middle" }}>
      <path d="M16 20 L8 28 L14 32 L14 56 L50 56 L50 32 L56 28 L48 20 L40 26 L32 22 L24 26 Z" fill="#2a2a3e" stroke="#5a5a8a" strokeWidth="1.5"/>
      <path d="M24 20 Q32 16 40 20 L36 28 L32 24 L28 28Z" fill="#1a1a2e" stroke="#4a4a6a" strokeWidth="1"/>
      <line x1="32" y1="30" x2="32" y2="52" stroke="#d4af37" strokeWidth="1.2" opacity="0.7"/>
      <line x1="20" y1="40" x2="44" y2="40" stroke="#d4af37" strokeWidth="1.2" opacity="0.7"/>
      <path d="M14 32 L8 28 L12 48 L14 48Z" fill="#2a2a3e" stroke="#5a5a8a" strokeWidth="1"/>
      <path d="M50 32 L56 28 L52 48 L50 48Z" fill="#2a2a3e" stroke="#5a5a8a" strokeWidth="1"/>
    </svg>
  );
}

function MerchantSVG({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" style={{ display:"inline-block", verticalAlign:"middle" }}>
      <ellipse cx="32" cy="50" rx="20" ry="6" fill="#b8860b" stroke="#8a6008" strokeWidth="1"/>
      <rect x="12" y="38" width="40" height="12" fill="#d4af37" stroke="#a07a10" strokeWidth="1"/>
      <ellipse cx="32" cy="38" rx="20" ry="6" fill="#e8c840" stroke="#a07a10" strokeWidth="1"/>
      <rect x="12" y="26" width="40" height="12" fill="#d4af37" stroke="#a07a10" strokeWidth="1"/>
      <ellipse cx="32" cy="26" rx="20" ry="6" fill="#e8c840" stroke="#a07a10" strokeWidth="1"/>
      <rect x="12" y="16" width="40" height="10" fill="#d4af37" stroke="#a07a10" strokeWidth="1"/>
      <ellipse cx="32" cy="16" rx="20" ry="6" fill="#f0d050" stroke="#a07a10" strokeWidth="1.2"/>
    </svg>
  );
}

function BlacksmithSVG({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" style={{ display:"inline-block", verticalAlign:"middle" }}>
      <rect x="28" y="8" width="26" height="14" rx="3" fill="#6b6b7a" stroke="#4a4a5a" strokeWidth="1.2"/>
      <rect x="35" y="20" width="7" height="36" rx="3" fill="#8b6a3e" stroke="#6a4a20" strokeWidth="1"/>
      <rect x="8" y="46" width="30" height="8" rx="2" fill="#3a3a4a" stroke="#5a5a6a" strokeWidth="1"/>
      <rect x="12" y="38" width="22" height="10" rx="2" fill="#4a4a5a" stroke="#5a5a6a" strokeWidth="1"/>
      <line x1="12" y1="36" x2="8" y2="28" stroke="#d4af37" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="18" y1="34" x2="16" y2="24" stroke="#ef8844" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="8" y1="30" x2="4" y2="24" stroke="#d4af37" strokeWidth="1" strokeLinecap="round"/>
    </svg>
  );
}

function InnSVG({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" style={{ display:"inline-block", verticalAlign:"middle" }}>
      <rect x="8" y="26" width="48" height="32" rx="2" fill="#1a1a2e" stroke="#5a5a8a" strokeWidth="1.2"/>
      <path d="M4 28 L32 8 L60 28 Z" fill="#2a2a3e" stroke="#5a5a8a" strokeWidth="1.2"/>
      <rect x="26" y="40" width="12" height="18" rx="6" fill="#080810"/>
      <rect x="12" y="32" width="10" height="8" rx="2" fill="#d4af3766"/>
      <rect x="42" y="32" width="10" height="8" rx="2" fill="#d4af3766"/>
      <rect x="20" y="22" width="24" height="8" rx="2" fill="#8b6a3e" stroke="#6a4a20" strokeWidth="0.8"/>
    </svg>
  );
}

function BulletinSVG({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" style={{ display:"inline-block", verticalAlign:"middle" }}>
      <rect x="8" y="10" width="48" height="44" rx="3" fill="#8b6a3e" stroke="#6a4a20" strokeWidth="1.5"/>
      <rect x="10" y="12" width="44" height="40" rx="2" fill="#7a5a2e" stroke="#5a3a10" strokeWidth="0.8"/>
      <rect x="14" y="16" width="16" height="12" rx="1" fill="#e8dcc8" stroke="#c8b898" strokeWidth="0.6"/>
      <rect x="34" y="16" width="16" height="12" rx="1" fill="#e8dcc8" stroke="#c8b898" strokeWidth="0.6"/>
      <rect x="14" y="32" width="36" height="10" rx="1" fill="#e0d4b8" stroke="#c8b898" strokeWidth="0.6"/>
      <circle cx="22" cy="20" r="2" fill="#c04040"/>
      <circle cx="42" cy="20" r="2" fill="#c04040"/>
      <line x1="16" y1="44" x2="46" y2="44" stroke="#c8b898" strokeWidth="0.8"/>
    </svg>
  );
}

function LeaveSVG({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" style={{ display:"inline-block", verticalAlign:"middle" }}>
      <rect x="10" y="8" width="36" height="50" rx="3" fill="#1a1a2e" stroke="#5a5a8a" strokeWidth="1.5"/>
      <rect x="14" y="12" width="28" height="42" rx="2" fill="#2a2a3e" stroke="#4a4a6a" strokeWidth="1"/>
      <circle cx="36" cy="38" r="3" fill="#d4af37" stroke="#a07a10" strokeWidth="0.8"/>
      <line x1="44" y1="32" x2="56" y2="32" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="50" y1="26" x2="56" y2="32" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="50" y1="38" x2="56" y2="32" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}

function CampfireSVG({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" style={{ display:"inline-block", verticalAlign:"middle" }}>
      <rect x="12" y="44" width="40" height="8" rx="4" fill="#6b3a1e" stroke="#4a2a10" strokeWidth="1"/>
      <rect x="20" y="48" width="24" height="6" rx="3" fill="#8b4a2e" stroke="#6a3a18" strokeWidth="0.8"/>
      <path d="M22,44 Q18,30 24,20 Q28,34 32,28 Q36,18 38,24 Q42,14 40,8 Q48,18 46,30 Q50,24 48,36 Q46,44 42,44Z" fill="#d45510" opacity="0.9"/>
      <path d="M26,44 Q24,34 28,26 Q30,34 32,30 Q34,22 36,28 Q38,34 38,44Z" fill="#f4a020"/>
      <path d="M29,44 Q28,38 32,32 Q36,38 35,44Z" fill="#fadd80"/>
      <ellipse cx="32" cy="44" rx="14" ry="4" fill="#d45510" opacity="0.3"/>
    </svg>
  );
}

function BedSVG({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" style={{ display:"inline-block", verticalAlign:"middle" }}>
      <rect x="6" y="30" width="52" height="24" rx="3" fill="#2a2a3e" stroke="#5a5a8a" strokeWidth="1.2"/>
      <rect x="10" y="26" width="18" height="12" rx="4" fill="#e8dcc8" stroke="#c8b898" strokeWidth="0.8"/>
      <rect x="10" y="34" width="44" height="16" rx="2" fill="#3a3a6a" stroke="#5a5a9a" strokeWidth="0.8"/>
      <rect x="6" y="20" width="10" height="36" rx="2" fill="#1a1a2e" stroke="#4a4a6a" strokeWidth="1"/>
      <rect x="10" y="52" width="6" height="8" rx="1" fill="#1a1a2e"/>
      <rect x="48" y="52" width="6" height="8" rx="1" fill="#1a1a2e"/>
    </svg>
  );
}

function ScrollSVG({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" style={{ display:"inline-block", verticalAlign:"middle" }}>
      <rect x="14" y="6" width="36" height="52" rx="4" fill="#c8a870" stroke="#8a6a30" strokeWidth="1.5"/>
      <ellipse cx="14" cy="32" rx="5" ry="26" fill="#b89050" stroke="#8a6a30" strokeWidth="1.2"/>
      <ellipse cx="50" cy="32" rx="5" ry="26" fill="#b89050" stroke="#8a6a30" strokeWidth="1.2"/>
      <line x1="22" y1="18" x2="42" y2="18" stroke="#6a4a10" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="22" y1="26" x2="42" y2="26" stroke="#6a4a10" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="22" y1="34" x2="36" y2="34" stroke="#6a4a10" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="22" y1="42" x2="38" y2="42" stroke="#6a4a10" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function MedalSVG({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" style={{ display:"inline-block", verticalAlign:"middle" }}>
      <path d="M24 8 L32 18 L40 8 L44 16 L32 28 L20 16Z" fill="#4a4a9a" stroke="#3a3a7a" strokeWidth="1"/>
      <line x1="28" y1="8" x2="32" y2="28" stroke="#6a6aaa" strokeWidth="1.5"/>
      <line x1="36" y1="8" x2="32" y2="28" stroke="#6a6aaa" strokeWidth="1.5"/>
      <circle cx="32" cy="44" r="16" fill="#d4af37" stroke="#a07a10" strokeWidth="2"/>
      <circle cx="32" cy="44" r="12" fill="#e8c040" stroke="#c09020" strokeWidth="0.8"/>
      <path d="M32 34 L34 41 L41 41 L35.5 45.5 L37.5 52 L32 48 L26.5 52 L28.5 45.5 L23 41 L30 41Z" fill="#a07a10"/>
    </svg>
  );
}

function KillSVG({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" style={{ display:"inline-block", verticalAlign:"middle" }}>
      <path d="M32 8 L38 28 L32 32 L26 28 Z" fill="#b0b8c8" stroke="#8090a8" strokeWidth="1"/>
      <circle cx="32" cy="8" r="3" fill="#c01818"/>
      <rect x="24" y="30" width="16" height="5" rx="2" fill="#d4af37" stroke="#a07a10" strokeWidth="0.8"/>
      <rect x="28" y="34" width="8" height="14" rx="3" fill="#6b3a1e" stroke="#4a2a10" strokeWidth="1"/>
      <circle cx="32" cy="50" r="4" fill="#8b8b6a" stroke="#6a6a4a" strokeWidth="0.8"/>
    </svg>
  );
}

function DeliverSVG({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" style={{ display:"inline-block", verticalAlign:"middle" }}>
      <rect x="8" y="18" width="48" height="34" rx="3" fill="#1a1a2e" stroke="#5a5a8a" strokeWidth="1.2"/>
      <path d="M8 18 L32 36 L56 18Z" fill="#2a2a4a" stroke="#5a5a8a" strokeWidth="1"/>
      <circle cx="32" cy="34" r="6" fill="#8b0000" stroke="#6a0000" strokeWidth="0.8"/>
      <text x="32" y="37" textAnchor="middle" fontSize="8" fill="#d4af37" fontWeight="700">✦</text>
    </svg>
  );
}

function GatherSVG({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" style={{ display:"inline-block", verticalAlign:"middle" }}>
      <rect x="10" y="22" width="44" height="34" rx="3" fill="#8b6a3e" stroke="#6a4a20" strokeWidth="1.5"/>
      <rect x="8" y="16" width="48" height="10" rx="2" fill="#9b7a4e" stroke="#6a4a20" strokeWidth="1.2"/>
      <line x1="32" y1="22" x2="32" y2="56" stroke="#6a4a20" strokeWidth="1.2"/>
      <line x1="10" y1="36" x2="54" y2="36" stroke="#6a4a20" strokeWidth="1"/>
      <rect x="8" y="28" width="48" height="4" rx="1" fill="#4a4a5a" stroke="#3a3a4a" strokeWidth="0.5"/>
      <rect x="8" y="44" width="48" height="4" rx="1" fill="#4a4a5a" stroke="#3a3a4a" strokeWidth="0.5"/>
      <rect x="28" y="14" width="8" height="6" rx="1" fill="#d4af37" stroke="#a07a10" strokeWidth="0.8"/>
    </svg>
  );
}

function CrownSVG({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 60" fill="none" style={{ display:"inline-block", verticalAlign:"middle" }}>
      <path d="M8 48 L8 22 L24 36 L40 8 L56 36 L72 22 L72 48 Z" fill="#d4af37" stroke="#a07a10" strokeWidth="2"/>
      <rect x="8" y="46" width="64" height="10" rx="3" fill="#b8860b" stroke="#a07a10" strokeWidth="1.5"/>
      <circle cx="40" cy="10" r="5" fill="#e8c040"/>
      <circle cx="10" cy="24" r="4" fill="#e8c040"/>
      <circle cx="70" cy="24" r="4" fill="#e8c040"/>
      <circle cx="20" cy="50" r="3" fill="#ff4444"/>
      <circle cx="40" cy="50" r="3" fill="#4488ff"/>
      <circle cx="60" cy="50" r="3" fill="#44cc44"/>
    </svg>
  );
}

function SkillsButton({ learnedAbilities, abilityChoicePopup, skillsOpen, setSkillsOpen }) {
  const hasSkills = learnedAbilities.spells.length > 0 || learnedAbilities.specials.length > 0;
  const hasPending = !!abilityChoicePopup;
  return (
    <button
      onClick={() => { if (!hasSkills && !hasPending) return; setSkillsOpen(prev => !prev); }}
      style={{
        ...S.btn, flex: 1, padding: "8px 6px", fontSize: 17,
        boxShadow: hasPending ? "0 0 12px #d4af37cc" : "0 2px 12px #000a",
        background: hasPending ? "linear-gradient(180deg, #2a1e00, #1a1200)"
          : skillsOpen ? "linear-gradient(180deg, #1a0e2a, #100814)" : "linear-gradient(180deg, #2a1f0e, #1a140a)",
        borderColor: hasPending ? "#d4af37" : skillsOpen ? "#a855f7" : (hasSkills ? "#a855f7" : "#555"),
        color: hasPending ? "#d4af37" : skillsOpen ? "#a855f7" : (hasSkills ? "#a855f7" : "#555"),
        opacity: (hasSkills || hasPending) ? 1 : 0.35,
        cursor: (hasSkills || hasPending) ? "pointer" : "not-allowed",
        animation: hasPending ? "pulse 1.2s ease-in-out infinite" : "none",
      }}
    >
      ✨ Skills{hasPending ? " !" : ""}
    </button>
  );
}

function GearScore({ equipment }) {
  return (equipment.weapon?.itemLevel || 0) +
    (equipment.chest?.itemLevel || 0) +
    (equipment.shield?.itemLevel || 0) +
    (equipment.head?.itemLevel || 0);
}

function InventoryPanel({ stackedInventory, inventory, currentCity, useItem, equipItem, sellItem, discardItem, setInventoryOpen, getUniqueStacks }) {
  const potions    = stackedInventory.filter(s => s.item.type === "consumable");
  const questItems = stackedInventory.filter(s => s.item.type === "questitem" || s.item.type === "deliveryitem");
  const equips     = stackedInventory.filter(s => s.item.type === "armor");
  const sectionLabel = (txt) => (
    <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", opacity: 0.45, margin: "10px 0 5px 0" }}>{txt}</div>
  );
  const renderStack = (stack) => {
    const { item, count, indices } = stack;
    const idx = indices[0];
    const sellValue = Math.max(1, Math.floor((item.cost || 10) * 0.1));
    const subText = item.type === "consumable"
      ? (item.effect === "repel" ? `${item.value} steps no encounters` : `${item.healPercent ? `+${Math.round(item.healPercent * 100)}% HP` : `+${item.value} HP`}`)
      : item.type === "armor"
        ? `${item.rarity || "Normal"} • ${item.slot.charAt(0).toUpperCase() + item.slot.slice(1)}${item.bonusDamage > 0 ? ` • +${item.bonusDamage} Dmg` : ""}${item.bonusDefense > 0 ? ` • +${item.bonusDefense} Def` : ""}${item.itemLevel ? ` • Lvl ${item.itemLevel}` : ""}`
        : item.type === "deliveryitem" ? "📬 Delivery" : "Quest Item";
    return (
      <div key={stack.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #d4af3709", gap: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: item.rarityColor || "#e8d7c3", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {item.name}{count > 1 && <span style={{ color: "#d4af37", marginLeft: 5 }}>×{count}</span>}
          </div>
          <div style={{ fontSize: 12, opacity: 0.5, marginTop: 1 }}>{subText}</div>
        </div>
        <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
          {item.type === "consumable" && (
            <button onClick={() => useItem(item, idx)} style={{ ...S.btn, ...S.btnSuccess, padding: "3px 8px", fontSize: 12 }}>Use</button>
          )}
          {item.type === "armor" && (
            <button onClick={() => equipItem(item, idx)} style={{ ...S.btn, padding: "3px 8px", fontSize: 12, borderColor: "#60a5fa88", color: "#60a5fa" }}>Equip</button>
          )}
          {currentCity && item.type !== "questitem" && item.type !== "deliveryitem" && (
            <button onClick={() => sellItem(idx)} style={{ ...S.btn, padding: "3px 8px", fontSize: 12 }}>{sellValue}g</button>
          )}
          <button onClick={() => discardItem(idx)} style={{ ...S.btn, ...S.btnDanger, padding: "3px 8px", fontSize: 12 }}>🗑️</button>
        </div>
      </div>
    );
  };
  return (
    <div style={{
      position: "fixed", bottom: 60, left: 8, zIndex: 999,
      width: "calc(25% - 14px)", maxHeight: "70vh", overflowY: "auto",
      background: "rgba(10,14,39,0.97)", border: "1px solid #d4af3766",
      borderRadius: 10, padding: 14, boxShadow: "0 4px 24px #000c",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, paddingBottom: 8, borderBottom: "1px solid #d4af3722" }}>
        <span style={{ ...S.gold, fontSize: 17, fontWeight: 700 }}>🎒 Bag</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, opacity: 0.5 }}>{getUniqueStacks(inventory)}/{INVENTORY_CAPACITY}</span>
          <button onClick={() => setInventoryOpen(false)} style={{ background: "none", border: "none", color: "#e8d7c3", cursor: "pointer", fontSize: 18, padding: 0 }}>✕</button>
        </div>
      </div>
      {stackedInventory.length === 0 && <div style={{ opacity: 0.5, fontSize: 14, textAlign: "center", padding: 12 }}>Bag is empty.</div>}
      {potions.length > 0 && <>{sectionLabel("Potions")}{potions.map(renderStack)}</>}
      {questItems.length > 0 && <>{sectionLabel("Quest Items")}{questItems.map(renderStack)}</>}
      {equips.length > 0 && <>{sectionLabel("Equipment")}{equips.map(renderStack)}</>}
    </div>
  );
}

function AbilityCards({ abilityChoicePopup, learnAbility }) {
  const tag = (label, color, bg) => (
    <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4, fontWeight: 600, background: bg, color, border: `1px solid ${color}44`, whiteSpace: "nowrap" }}>{label}</span>
  );
  const effectDesc = (s) => {
    if (s.effect === "slow")       return "-50% enemy dmg";
    if (s.effect === "bleed")      return `Bleed ${s.bleedDuration} rounds`;
    if (s.effect === "burn")       return `Burn ${s.burnDuration} rounds`;
    if (s.effect === "poison")     return `Poison ${s.poisonDuration} rounds`;
    if (s.effect === "stun")       return `Stun ${s.stunDuration} rounds`;
    if (s.effect === "crit")       return "Guaranteed crit ×2";
    if (s.effect === "defense")    return "+50% Defense 2 rounds";
    if (s.effect === "heal")       return `Lifesteal ${Math.round((s.healPercent||0)*100)}%`;
    if (s.effect === "playerHeal") return "Heals you";
    if (s.effect === "dodge")      return "Stealth 2 rounds";
    return null;
  };
  const renderCard = (ability, type) => {
    const isSpell = type === "spell";
    const accent = isSpell ? "#4169E1" : "#ff8800";
    const bg = isSpell ? "#0066ff11" : "#ff660011";
    const desc = effectDesc(ability);
    return (
      <button key={ability.id} onClick={() => learnAbility(ability.id, type)}
        style={{ display: "block", width: "100%", padding: "12px 14px", marginBottom: 10, borderRadius: 8, background: bg, border: `1px solid ${accent}55`, color: "#e8d7c3", cursor: "pointer", textAlign: "left", transition: "all 0.2s" }}
        onMouseEnter={e => { e.currentTarget.style.background = `${accent}22`; e.currentTarget.style.boxShadow = `0 0 14px ${accent}44`; }}
        onMouseLeave={e => { e.currentTarget.style.background = bg; e.currentTarget.style.boxShadow = "none"; }}
      >
        <div style={{ fontWeight: 700, fontSize: 16, color: accent, marginBottom: 6 }}>{ability.name}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: desc ? 6 : 0 }}>
          {isSpell ? tag(`${ability.manaCost} Mana`, "#60a5fa", "#60a5fa11") : tag(`${Math.round(ability.hpCostPercent * 100)}% HP`, "#f87171", "#f8717111")}
          {ability.dmgRange && ability.dmgRange[1] > 0 && tag(`${ability.dmgRange[0]}–${ability.dmgRange[1]} Dmg`, "#ef4444", "#ef444411")}
          {ability.hitCount && tag(`×${ability.hitCount} Hits`, "#fbbf24", "#fbbf2411")}
          {desc && tag(desc, "#c084fc", "#c084fc11")}
        </div>
      </button>
    );
  };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <div style={{ padding: 12, background: "#0066ff08", borderRadius: 8, border: "1px solid #0066ff33" }}>
        <h3 style={{ color: "#4169E1", margin: "0 0 12px 0", fontSize: 18 }}>🔮 Spells (Mana)</h3>
        {abilityChoicePopup?.availableSpells?.length > 0
          ? abilityChoicePopup.availableSpells.map(s => renderCard(s, "spell"))
          : <div style={{ opacity: 0.5, fontSize: 13 }}>No new spells available</div>}
      </div>
      <div style={{ padding: 12, background: "#ff660008", borderRadius: 8, border: "1px solid #ff660033" }}>
        <h3 style={{ color: "#ff8800", margin: "0 0 12px 0", fontSize: 18 }}>⚡ Specials (HP)</h3>
        {abilityChoicePopup?.availableSpecials?.length > 0
          ? abilityChoicePopup.availableSpecials.map(s => renderCard(s, "special"))
          : <div style={{ opacity: 0.5, fontSize: 13 }}>No new specials available</div>}
      </div>
    </div>
  );
}

function EnemyLevelBadge({ enemyLevel, playerLevel }) {
  const diff = enemyLevel - playerLevel;
  const lvColor = diff <= -5 ? "#6b7280" : diff <= -2 ? "#4ade80" : diff <= 2 ? "#facc15" : diff <= 5 ? "#fb923c" : "#ef4444";
  return <div style={{ fontSize: 12, fontWeight: 700, color: lvColor, letterSpacing: 1 }}>Lv.{enemyLevel}</div>;
}

function CombatItemsPanel({ inventory, useItemInCombat }) {
  const seen = new Map();
  const consumables = [];
  for (let i = 0; i < inventory.length; i++) {
    const item = inventory[i];
    if (item.type !== "consumable") continue;
    if (seen.has(item.name)) { seen.get(item.name).count++; }
    else { const entry = { item, idx: i, count: 1 }; seen.set(item.name, entry); consumables.push(entry); }
  }
  return (
    <div style={{ background: "#ffffff06", borderRadius: 8, padding: 10, marginBottom: 12, border: "1px solid #4ade8033" }}>
      <div style={{ fontSize: 14, opacity: 0.5, marginBottom: 6 }}>Use an item (costs your turn):</div>
      {consumables.length === 0 && <div style={{ fontSize: 15, opacity: 0.4 }}>No consumables available.</div>}
      {consumables.map(({ item, idx, count }) => (
        <div key={item.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid #d4af3711" }}>
          <div>
            <span style={{ fontSize: 15, fontWeight: 600 }}>{item.name}</span>
            {count > 1 && <span style={{ fontSize: 14, fontWeight: 700, ...S.gold, marginLeft: 6 }}>×{count}</span>}
            <span style={{ fontSize: 13, opacity: 0.5, marginLeft: 6 }}>{item.effect === "repel" ? `${item.value} steps` : `${item.healPercent ? `+${Math.round(item.healPercent * 100)}% HP` : `+${item.value} HP`}`}</span>
          </div>
          <button onClick={() => useItemInCombat(item, idx)} style={{ ...S.btn, ...S.btnSuccess, padding: "4px 12px", fontSize: 14 }}>Use</button>
        </div>
      ))}
    </div>
  );
}

function CaveQuestBanner({ quests, caveConfirm, getQuestProgress }) {
  const relatedQuest = quests.find(q =>
    q.questKind === "chunkBossHunt" &&
    q.targetChunkX === Math.floor(caveConfirm.x / CHUNK_SIZE) &&
    q.targetChunkY === Math.floor(caveConfirm.y / CHUNK_SIZE)
  );
  if (!relatedQuest) return null;
  if (!relatedQuest.accepted) return (
    <div style={{ background: "#d4af3722", borderLeft: "4px solid #d4af37", padding: 12, borderRadius: 6, marginBottom: 16, fontSize: 14, textAlign: "left" }}>
      <div style={{ fontWeight: 600, color: "#d4af37", marginBottom: 4 }}>📜 Quest Available</div>
      <div style={{ opacity: 0.8 }}>A quest awaits in the nearby town:<br/><span style={{ color: "#d4af37", fontWeight: 500 }}>"{relatedQuest.title}"</span></div>
    </div>
  );
  const progress = getQuestProgress(relatedQuest);
  return (
    <div style={{ background: "#4ade8022", borderLeft: "4px solid #4ade80", padding: 12, borderRadius: 6, marginBottom: 16, fontSize: 14, textAlign: "left" }}>
      <div style={{ fontWeight: 600, color: "#4ade80", marginBottom: 4 }}>⚔️ Quest Active</div>
      <div style={{ opacity: 0.8 }}>{relatedQuest.title}<br/><span style={{ color: "#4ade80" }}>Progress: {progress}/{relatedQuest.targetBosses}</span></div>
    </div>
  );
}

function SkillsPanel({ learnedAbilities, onClose }) {
  const tag = (label, cls) => (
    <span style={{
      fontSize: 11, padding: "2px 7px", borderRadius: 4, fontWeight: 600, whiteSpace: "nowrap",
      ...(cls === "dmg"    ? { background: "rgba(239,68,68,0.15)",   color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }   :
         cls === "mana"   ? { background: "rgba(65,105,225,0.15)",  color: "#60a5fa", border: "1px solid rgba(65,105,225,0.3)" }  :
         cls === "hp"     ? { background: "rgba(239,68,68,0.12)",   color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }   :
         cls === "effect" ? { background: "rgba(168,85,247,0.12)",  color: "#c084fc", border: "1px solid rgba(168,85,247,0.25)" } :
         cls === "heal"   ? { background: "rgba(74,222,128,0.12)",  color: "#4ade80", border: "1px solid rgba(74,222,128,0.25)" } :
         cls === "hits"   ? { background: "rgba(251,191,36,0.12)",  color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)" } :
         cls === "dur"    ? { background: "rgba(148,163,184,0.1)",  color: "#94a3b8", border: "1px solid rgba(148,163,184,0.2)" } :
                            { background: "rgba(255,255,255,0.05)", color: "#9ca3af", border: "1px solid rgba(255,255,255,0.1)" })
    }}>{label}</span>
  );
  const sectionLabel = (txt, sub) => (
    <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", opacity: 0.45, margin: "10px 0 6px 0", display: "flex", alignItems: "center", gap: 6 }}>
      {txt} {sub && <span style={{ fontSize: 10, opacity: 0.6, textTransform: "none", letterSpacing: 0 }}>{sub}</span>}
      <div style={{ flex: 1, height: 1, background: "rgba(212,175,55,0.1)" }} />
    </div>
  );
  const renderSkill = (s, type) => {
    const duration = s.slowDuration || s.bleedDuration || s.burnDuration || s.poisonDuration || s.stunDuration || null;
    const effectLabel =
      s.effect === "slow"       ? "-50% enemy dmg" :
      s.effect === "bleed"      ? "Bleed/round" :
      s.effect === "burn"       ? "Burn/round" :
      s.effect === "poison"     ? "Poison/round" :
      s.effect === "stun"       ? "Stun" :
      s.effect === "crit"       ? "Guaranteed Crit ×2" :
      s.effect === "defense"    ? "+50% Defense" :
      s.effect === "heal"       ? `${Math.round((s.healPercent||0)*100)}% Lifesteal` :
      s.effect === "playerHeal" ? "Heal Self" :
      s.effect === "reflect"    ? "No extra effect" :
      s.effect === "dodge"      ? "Stealth 2 rounds" :
      null;
    return (
      <div key={s.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 0", borderBottom: "1px solid rgba(212,175,55,0.07)" }}>
        <div style={{ fontSize: 20, width: 28, textAlign: "center", flexShrink: 0, marginTop: 1 }}>{s.name.split(" ")[0]}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#e8d7c3", marginBottom: 2 }}>{s.name.split(" ").slice(1).join(" ")}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
            {s.dmgRange && s.dmgRange[1] > 0 && tag(`${s.dmgRange[0]}–${s.dmgRange[1]} Dmg`, "dmg")}
            {type === "spell"   && tag(`${s.manaCost} Mana`, "mana")}
            {type === "special" && tag(`${Math.round(s.hpCostPercent * 100)}% HP`, "hp")}
            {s.hitCount         && tag(`×${s.hitCount} Hits`, "hits")}
            {effectLabel        && tag(effectLabel, "effect")}
            {duration           && tag(`🕐 ${duration} rounds`, "dur")}
            {tag(`Lv. ${s.level}`, "lvl")}
          </div>
        </div>
      </div>
    );
  };
  const learnedSpells   = SPELLS.filter(s => learnedAbilities.spells.includes(s.id));
  const learnedSpecials = SPECIALS.filter(s => learnedAbilities.specials.includes(s.id));
  return (
    <div style={{
      position: "fixed", bottom: 60, right: 8, zIndex: 999,
      width: "calc(20% - 12px)", maxHeight: "70vh", overflowY: "auto",
      background: "rgba(10,14,39,0.97)", border: "1px solid rgba(168,85,247,0.4)",
      borderRadius: 10, padding: 14, boxShadow: "0 4px 24px #000c",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, paddingBottom: 8, borderBottom: "1px solid rgba(168,85,247,0.2)" }}>
        <span style={{ color: "#a855f7", fontSize: 17, fontWeight: 700 }}>✨ Skills</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#e8d7c3", cursor: "pointer", fontSize: 18, padding: 0 }}>✕</button>
      </div>
      {learnedSpells.length > 0 && <>{sectionLabel("🔵 Spells", "(Mana)")}{learnedSpells.map(s => renderSkill(s, "spell"))}</>}
      {learnedSpecials.length > 0 && <>{sectionLabel("🔴 Specials", "(HP)")}{learnedSpecials.map(s => renderSkill(s, "special"))}</>}
    </div>
  );
}

function Game({ playerData, onMainMenu }) {
  const isLoaded = !playerData.isNew && playerData.worldSeed != null;
  const playerName = playerData.name || playerData.playerName;
  const initialAttrs = playerData.attrs || playerData.attributes;
// ✅ SPRITE MAP from JSON - Maps sprite keys to grid positions
const SPRITE_MAP = {
  "ember_drake": { row: 0, col: 0 },
  "man_eater": { row: 0, col: 1 },
  "orc_warchief": { row: 0, col: 2 },
  "dusk_harpy": { row: 0, col: 3 },
  "imp_cutlass": { row: 0, col: 4 },
  "pyre_tortoise": { row: 0, col: 5 },
  "venom_snail": { row: 0, col: 6 },
  "ghastly": { row: 0, col: 7 },
  "moth": { row: 0, col: 8 },
  "bog_frog": { row: 1, col: 0 },
  "flame_knight": { row: 1, col: 1 },
  "bramble_boar": { row: 1, col: 2 },
  "brutal_ogre": { row: 1, col: 3 },
  "lava_scorpion": { row: 1, col: 4 },
  "goblin_warlock": { row: 1, col: 5 },
  "scarab_tank": { row: 1, col: 6 },
  "ice_ogre": { row: 1, col: 7 },
  "cursed_mummy": { row: 1, col: 8 },
  "basilisk": { row: 2, col: 0 },
  "rock_golem": { row: 2, col: 1 },
  "ashen_roc": { row: 2, col: 2 },
  "sea_serpent": { row: 2, col: 3 },
  "mimic_chest": { row: 2, col: 4 },
  "eye_abomination": { row: 2, col: 5 },
  "moss_bear": { row: 2, col: 6 },
  "bog_treant": { row: 2, col: 7 },
  "toadstool_shaman": { row: 2, col: 8 },
  "vine_serpent": { row: 3, col: 0 },
  "moss_beetle": { row: 3, col: 1 },
  "forest_dryad": { row: 3, col: 2 },
  "leaf_goblin": { row: 3, col: 3 },
  "twin_flytraps": { row: 3, col: 4 },
  "mushroom_squirrels": { row: 3, col: 5 },
  "slime_snail_forest": { row: 3, col: 6 },
  "twig_trickster": { row: 3, col: 7 },
  "wasp_scout": { row: 3, col: 8 },
};

const spriteSheetUrl = "/monster_spritesheet.png";
const heroUrl = "hero_sprite.png";


  const currentSlot = playerData.selectedSlot ?? 0;  // ✅ Get slot number

  const [worldSeed] = useState(() => isLoaded ? playerData.worldSeed : Math.floor(Math.random() * 99999));

  // ✅ NEW: Find first city in Starter Plains for new character spawn
  const getStarterPlainsCity = () => {
    if (isLoaded) return null; // Loaded character uses saved position
    
    // Starter Plains chunk bounds: xMin: 170, xMax: 300, yMin: 280, yMax: 410
    const starterPlainsCenter = { x: 235, y: 345 }; // Center of Starter Plains
    
    // We'll use a fixed offset from center to ensure consistent nearby spawn
    // Offset slightly to ensure player isn't exactly on the generated city
    return { x: starterPlainsCenter.x + 15, y: starterPlainsCenter.y + 15 };
  };

  const startPosition = getStarterPlainsCity() || { 
    x: Math.floor((170 + 300) / 2),  // Fallback: Chunk 10 center X
    y: Math.floor((280 + 410) / 2)   // Fallback: Chunk 10 center Y
  };

  const startX = startPosition.x;
  const startY = startPosition.y;

  const [pos, setPos] = useState(isLoaded ? playerData.pos : { x: startX, y: startY });

  const { cities, caves } = useChunkWorld(worldSeed, pos);
  const [hp, setHp] = useState(isLoaded ? playerData.hp : () => calcStats(initialAttrs, {}).maxHp);
  const [mana, setMana] = useState(isLoaded ? playerData.mana : () => calcStats(initialAttrs, {}).maxMana);
  const [xp, setXp] = useState(isLoaded ? playerData.xp : 0);
  const [level, setLevel] = useState(isLoaded ? playerData.level : 1);
  const [gold, setGold] = useState(isLoaded ? playerData.gold : 20);
  const [attrs, setAttrs] = useState(initialAttrs);
  const [statPoints, setStatPoints] = useState(isLoaded ? playerData.statPoints || 0 : 0);
  const [equipment, setEquipment] = useState(isLoaded ? playerData.equipment : { weapon: null, chest: null, shield: null, head: null });
  const [inventory, setInventory] = useState(isLoaded ? playerData.inventory : []);
  const [learnedAbilities, setLearnedAbilities] = useState(isLoaded ? playerData.learnedAbilities || { spells: [], specials: [] } : { spells: [], specials: [] });
  const [abilityChoicePopup, setAbilityChoicePopup] = useState(isLoaded ? (playerData.pendingAbilityChoice || null) : null);
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [potionUseModal, setPotionUseModal] = useState(false);
  const [playerStatus, setPlayerStatus] = useState({
    type: null,
    duration: 0,
    damagePerTurn: 0
  });
  const [enemyStatus, setEnemyStatus] = useState({
    type: null,
    duration: 0,
    damagePerTurn: 0
  });

  // ✅ NEW: BUFF SYSTEM (können mehrere gleichzeitig aktiv sein!)
  const [playerBuffs, setPlayerBuffs] = useState({
    active: [],  // Array von { type, duration, charges? }
  });
  const [enemyBuffs, setEnemyBuffs] = useState({
    active: [],  // Array von { type, duration, charges? }
  });

  const [quests, setQuests] = useState(isLoaded ? playerData.quests : []);
  const [completedQuestIds, setCompletedQuestIds] = useState(isLoaded ? (playerData.completedQuestIds instanceof Set ? playerData.completedQuestIds : new Set(playerData.completedQuestIds || [])) : new Set());
  const [acceptedChunkBossQuests, setAcceptedChunkBossQuests] = useState(isLoaded ? playerData.acceptedChunkBossQuests || {} : {});
  const [log, setLog] = useState(isLoaded ? playerData.log || ["Welcome back to the Realm of Shadows!"] : ["Welcome to the Realm of Shadows!"]);
  const [screen, setScreen] = useState("world");
  const [currentCity, setCurrentCity] = useState(null);
  const [lastCity, setLastCity] = useState(isLoaded ? playerData.lastCity : null);
  const [visitedCities, setVisitedCities] = useState(isLoaded ? new Set(playerData.visitedCities || []) : new Set());
  const [firstSpawnDone, setFirstSpawnDone] = useState(isLoaded);  // ✅ NEW: Track if first spawn already happened
  const [enemy, setEnemy] = useState(null);
  const [enemyHp, setEnemyHp] = useState(0);
  const [combatStartPos, setCombatStartPos] = useState(null);
  const [combatLog, setCombatLog] = useState([]);
  const [cityQuestsCache, setCityQuestsCache] = useState(isLoaded ? playerData.cityQuestsCache || {} : {});
  const [cityBulletinCache, setCityBulletinCache] = useState(isLoaded ? playerData.cityBulletinCache || {} : {});
  const [boughtUniqueIds, setBoughtUniqueIds] = useState(isLoaded ? new Set(playerData.boughtUniqueIds || []) : new Set());
  const [defeatedBosses, setDefeatedBosses] = useState(isLoaded ? new Set(playerData.defeatedBosses || []) : new Set());
  const [caveConfirm, setCaveConfirm] = useState(null);
  const [resting, setResting] = useState(false);
  const [repelSteps, setRepelSteps] = useState(0);
  const [restType, setRestType] = useState("free");
  const [questLogOpen, setQuestLogOpen] = useState(false);
  const [worldMapOpen, setWorldMapOpen] = useState(false);
  const [fastTravelMode, setFastTravelMode] = useState(false);
  const [fastTravelConfirm, setFastTravelConfirm] = useState(null); // { name, x, y }
  const [mapZoom, setMapZoom] = useState(2);
  const [mapCenter, setMapCenter] = useState(null);
  const [mapTooltip, setMapTooltip] = useState(null); // { name, x, y } screen coords
  const [charWindowOpen, setCharWindowOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const [combatItemsOpen, setCombatItemsOpen] = useState(false);
  const [introPopup, setIntroPopup] = useState(null);
  const [levelUpMsg, setLevelUpMsg] = useState(null);
  const [deathPopup, setDeathPopup] = useState(null);
  const [floatingDamages, setFloatingDamages] = useState([]);
  const restRef = useRef(null);
  const combatLogRef = useRef(null);

  useEffect(() => {
    if (combatLogRef.current) {
      combatLogRef.current.scrollTop = combatLogRef.current.scrollHeight;
    }
  }, [combatLog]);
  const bigMapCanvasRef = useRef(null);

  // Auto-save when returning to world screen or entering a city
  const doSave = useCallback(() => {
    const ok = saveGame({
      playerName, worldSeed, pos, hp, mana, xp, level, gold,
      attributes: attrs, statPoints, equipment, inventory,
      quests, completedQuestIds, acceptedChunkBossQuests, log: log.slice(-30),
      lastCity, cityQuestsCache, cityBulletinCache, boughtUniqueIds: [...boughtUniqueIds], defeatedBosses: [...defeatedBosses],
      visitedCities: [...visitedCities],
      maxHp: calcStats(attrs, equipment).maxHp,
      learnedAbilities,
      pendingAbilityChoice: abilityChoicePopup || null,
    }, currentSlot);  // ✅ Save to current slot
    setSaveMsg(ok ? "Game saved!" : "Save failed!");
    setTimeout(() => setSaveMsg(null), 1500);
  }, [playerName, worldSeed, pos, hp, mana, xp, level, gold, attrs, statPoints, equipment, inventory, quests, completedQuestIds, acceptedChunkBossQuests, log, lastCity, cityQuestsCache, cityBulletinCache, boughtUniqueIds, learnedAbilities, abilityChoicePopup, currentSlot]);

  // Auto-save when entering world or city screen
  useEffect(() => {
    if (screen === "world" || screen === "city") {
      try {
        saveGame({
          playerName, worldSeed, pos, hp, mana, xp, level, gold,
          attributes: attrs, statPoints, equipment, inventory,
          quests, completedQuestIds, acceptedChunkBossQuests, log: log.slice(-30),
          lastCity, cityQuestsCache, cityBulletinCache, boughtUniqueIds: [...boughtUniqueIds], defeatedBosses: [...defeatedBosses],
          visitedCities: [...visitedCities],
          maxHp: calcStats(attrs, equipment).maxHp,
          learnedAbilities,
          pendingAbilityChoice: abilityChoicePopup || null,
        }, currentSlot);  // ✅ Save to current slot
      } catch (e) {}
    }
  }, [screen, currentSlot]);

  // ✅ NEW: Auto-spawn new character directly on a city in Starter Plains (ONCE ONLY!)
  useEffect(() => {
    if (isLoaded || firstSpawnDone || screen !== "world" || Object.keys(cities).length === 0) return;  // Only for new characters, ONCE
    
    // Starter Plains chunk: xMin: 170, xMax: 300, yMin: 280, yMax: 410
    const starterPlainsCities = Object.entries(cities).filter(([key, city]) => {
      return city.x >= 170 && city.x <= 300 && city.y >= 280 && city.y <= 410;
    });
    
    if (starterPlainsCities.length > 0) {
      // Pick first city in Starter Plains
      const [, firstCity] = starterPlainsCities[0];
      
      // Spawn directly ON city ✅
      const spawnX = firstCity.x;
      const spawnY = firstCity.y;
      
      setPos({ x: spawnX, y: spawnY });
      setCurrentCity(firstCity);
      setLastCity(firstCity);
      setVisitedCities(prev => new Set([...prev, firstCity.name]));
      addLog(`🏰 Welcome to ${firstCity.name}!`);
      setIntroPopup(firstCity);
      setFirstSpawnDone(true);  // ✅ Mark as done so it never runs again!
    }
  }, [cities, isLoaded, firstSpawnDone, screen]);

  const stats = useMemo(() => calcStats(attrs, equipment), [attrs, equipment]);
  const xpToLevel = Math.floor(80 * Math.pow(level, 1.8));
  const difficulty = getDifficulty(pos.x, pos.y, level);
  const biome = getBiome(pos.x, pos.y, worldSeed);

  const activeQuests = quests.filter(q => q.accepted);

  // Group inventory into stacks for display
  const stackedInventory = useMemo(() => {
    const map = new Map();
    for (let i = 0; i < inventory.length; i++) {
      const item = inventory[i];
      const key = item.type === "armor"
        ? `${item.name}|${item.slot}|${item.bonusDamage}|${item.bonusDefense}`
        : `${item.name}|${item.type}`;
      if (map.has(key)) {
        const stack = map.get(key);
        stack.count++;
        stack.indices.push(i);
      } else {
        map.set(key, { item, count: 1, indices: [i], key });
      }
    }
    const all = Array.from(map.values());
    const categorize = (item) => {
      if (item.type === "consumable") return 0;
      if (item.type === "questitem" || item.type === "deliveryitem") return 1;
      return 2;
    };
    return all.sort((a, b) => {
      const catDiff = categorize(a.item) - categorize(b.item);
      if (catDiff !== 0) return catDiff;
      return a.item.name.localeCompare(b.item.name);
    });
  }, [inventory]);

  // Derive quest progress from inventory (gather) or kill counter (kill)
  const getQuestProgress = useCallback((quest) => {
    if (quest.questKind === "kill") {
      return Math.min(quest.killCount || 0, quest.targetCount);
    }
    if (quest.questKind === "chunkBossHunt") {
      // ✅ Boss hunt quests track bossKillCount
      return Math.min(quest.bossKillCount || 0, quest.targetBosses || 1);
    }
    if (quest.questKind === "deliver") {
      return inventory.some(i => i.name === quest.deliverItem && i.type === "deliveryitem") ? 1 : 0;
    }
    const count = inventory.filter(i => i.name === quest.targetItem).length;
    return Math.min(count, quest.targetCount);
  }, [inventory]);

  const isQuestComplete = useCallback((quest) => {
    const target = quest.questKind === "chunkBossHunt" ? quest.targetBosses : quest.targetCount;
    return getQuestProgress(quest) >= target;
  }, [getQuestProgress]);

  const addLog = useCallback((msg) => {
    setLog(prev => [...prev.slice(-9), msg]);
  }, []);

  // ✅ NEW: Add Floating Damage Text
  const addFloatingDamage = useCallback((damage, x, y, isCrit = false, isHeal = false, isBuff = false, isMiss = false) => {
    const id = Date.now() + Math.random();
    
    setFloatingDamages(prev => [
      ...prev,
      { id, damage, x, y, isCrit, isHeal, isBuff, isMiss }
    ]);
    
    // Remove nach 1 Sekunde
    setTimeout(() => {
      setFloatingDamages(prev => prev.filter(d => d.id !== id));
    }, 1000);
  }, []);

  // Level up
  useEffect(() => {
    if (xp >= xpToLevel) {
      const newLevel = level + 1;
      setXp(prev => prev - xpToLevel);
      setLevel(newLevel);
      setHp(stats.maxHp);
      setMana(stats.maxMana);
      setStatPoints(prev => prev + 2);
      addLog(`🎉 Level Up! You are now level ${newLevel}! +2 stat points!`);
      setLevelUpMsg(newLevel);
      
      if (newLevel % 5 === 0) {
        const availableSpells = SPELLS.filter(s => s.level === newLevel && !learnedAbilities.spells.includes(s.id));
        const availableSpecials = SPECIALS.filter(s => s.level === newLevel && !learnedAbilities.specials.includes(s.id));
        if (availableSpells.length > 0 || availableSpecials.length > 0) {
          setAbilityChoicePopup({ level: newLevel, availableSpells, availableSpecials });
        }
      }
    }
  }, [xp, xpToLevel, level, stats.maxHp, stats.maxMana, addLog, learnedAbilities]);

  // Inn rest: paid heals % of maxHp per tick, scaling with player level (max 5%)
  const innRate = Math.min(0.05, 0.01 + level * 0.002);
  const innHealPerTick = Math.max(1, Math.floor(stats.maxHp * innRate));
  const innCostPerTick = Math.max(1, Math.ceil(innHealPerTick / 2));

  // Resting
  useEffect(() => {
    if (resting) {
      const rate = restType === "paid" ? innHealPerTick : 1;
      const cost = restType === "paid" ? innCostPerTick : 0;
      restRef.current = setInterval(() => {
        setHp(prev => {
          const next = Math.min(prev + rate, stats.maxHp);
          if (next >= stats.maxHp) { setResting(false); }
          return next;
        });
        setMana(prev => Math.min(prev + (restType === "paid" ? 3 : 1), stats.maxMana));
        if (cost > 0) {
          setGold(prev => {
            if (prev < cost) { setResting(false); setRestType("free"); return 0; }
            return prev - cost;
          });
        }
      }, 1000);
    }
    return () => { if (restRef.current) clearInterval(restRef.current); };
  }, [resting, restType, innHealPerTick, innCostPerTick, stats.maxHp, stats.maxMana]);

  const rollLoot = useCallback((enemyData, itemLevel) => {
    const items = [];
    const tier = getDifficultyTier(itemLevel);

    // 1. Quest item drops
    const neededItems = new Set();
    activeQuests.forEach(q => {
      if (q.questKind === "gather" && !isQuestComplete(q)) neededItems.add(q.targetItem);
    });
    enemyData.loot.forEach(l => {
      if (!neededItems.has(l.name)) return;
      if (Math.random() < l.chance) {
        items.push({ name: l.name, type: "questitem", id: `qi_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` });
      }
    });
    activeQuests.forEach(q => {
      if (q.questKind !== "gather") return;
      if (isQuestComplete(q)) return;
      if (items.some(i => i.name === q.targetItem)) return;
      const alreadyHeld = inventory.filter(i => i.name === q.targetItem).length;
      if (alreadyHeld >= q.targetCount) return;
      if (Math.random() < 0.35) {
        const questTier = getDifficultyTier(itemLevel);
        if (QUEST_ITEMS_POOL[questTier]?.includes(q.targetItem)) {
          items.push({ name: q.targetItem, type: "questitem", id: `qi_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` });
        }
      }
    });

    // 2. Consumable drops (40% chance) — pick from current or any lower tier
    if (Math.random() < 0.40) {
      const allTiers = ["Beginner","Easy","Intermediate","Hard","Expert"];
      const tierIdx = allTiers.indexOf(tier);
      const availTiers = allTiers.slice(0, tierIdx + 1);
      const pickTier = availTiers[Math.floor(Math.random() * availTiers.length)];
      const potions = MERCHANT_ITEMS[pickTier] || MERCHANT_ITEMS.Beginner;
      const potion = potions[Math.floor(Math.random() * potions.length)];
      items.push({ ...potion, id: `loot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` });
    }

    // 3. Equipment drops — rarity capped by itemLevel via getAvailableRarityIndices
    const equipRoll = Math.random();
    let rarityIdx = -1;
    if      (equipRoll < 0.002) rarityIdx = 4;  // Legendary
    else if (equipRoll < 0.010) rarityIdx = 3;  // Epic
    else if (equipRoll < 0.030) rarityIdx = 2;  // Rare
    else if (equipRoll < 0.080) rarityIdx = 1;  // Uncommon
    else if (equipRoll < 0.180) rarityIdx = 0;  // Normal

    if (rarityIdx >= 0) {
      // Cap rarity by what's available at this itemLevel
      const available = getAvailableRarityIndices(itemLevel, false);
      const maxRarity = Math.min(rarityIdx, available[available.length - 1]);
      const rarity = RARITIES[maxRarity];
      const slot = pick(["weapon", "chest", "shield", "head"]);

      // Item name from tier-keyed ARMOR_NAMES
      const names = ARMOR_NAMES[slot]?.[tier] || ARMOR_NAMES[slot]?.Beginner || ["Unknown"];
      const baseName = names[Math.floor(Math.random() * names.length)];

      // Stats scale with itemLevel
      const baseDamage = itemLevel * 1.2;
      const baseDefense = itemLevel * 1.0;          // ✅ Shield: itemLevel * 1.0
      const baseHeadDefense = itemLevel * 0.2;      // ✅ Head: itemLevel * 0.2

      let name = baseName;
      if (maxRarity === 1) name = `${baseName} of ${pick(["Power","Might","Grace","Fortitude","Valor"])}`;
      else if (maxRarity === 2) name = `${baseName} of the ${pick(["Phoenix","Dragon","Titan","Storm","Shadow"])}`;
      else if (maxRarity === 3) name = `${pick(["Mythic","Ancient","Cursed","Enchanted"])} ${baseName}`;
      else if (maxRarity === 4) name = `${pick(["Godforged","Eternal","Primordial"])} ${baseName}`;

      items.push({
        name, type: "armor", slot,
        rarity: rarity.name, rarityColor: rarity.color,
        itemLevel,
        bonusDamage:  slot === "weapon" ? Math.round(baseDamage  * rarity.mult) : 0,
        bonusDefense: slot === "head" ? Math.round(baseHeadDefense * rarity.mult) : (slot === "chest" || slot === "shield" ? Math.round(baseDefense * rarity.mult) : 0),
        bonusStats: slot === "head" ? rollBonusStats(maxRarity, Math.random, true) : rollBonusStats(maxRarity, Math.random),
        cost: Math.round((itemLevel * 50) * rarity.costMult * (0.8 + Math.random() * 0.4)),
        id: `drop_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      });
    }

    return items;
  }, [activeQuests, isQuestComplete, inventory]);

  const move = useCallback((dx, dy) => {
    const nx = pos.x + dx, ny = pos.y + dy;
    if (nx < 0 || ny < 0 || nx >= WORLD_SIZE || ny >= WORLD_SIZE) return;

    // ✅ CHECK CAVES FIRST (before moving position!)
    const caveKey = `${nx},${ny}`;
    if (caves[caveKey] && !defeatedBosses.has(caveKey)) {
      setPos({ x: nx, y: ny });
      setCaveConfirm(caves[caveKey]);
      return;
    }

    // ✅ CHECK CITIES (before moving position!)
    const cityKey = `${nx},${ny}`;
    if (cities[cityKey]) {
      setPos({ x: nx, y: ny });
      setCurrentCity(cities[cityKey]);
      setLastCity(cities[cityKey]);
      setVisitedCities(prev => new Set([...prev, cities[cityKey].name]));  // ✅ Mark as visited
      setScreen("city");
      addLog(`🏰 Entered ${cities[cityKey].name}`);
      return;
    }

    // ✅ NOW move to normal tile
    setPos({ x: nx, y: ny });
    setHp(prev => Math.min(prev + Math.max(1, Math.floor(stats.maxHp * 0.02)), stats.maxHp));

    const tileBiome = getBiome(nx, ny, worldSeed);
    const noEncounterBiomes = new Set(["ocean"]);
    const diff = getDifficulty(nx, ny, level);

    // Decrement repel steps
    if (repelSteps > 0) {
      setRepelSteps(prev => {
        const next = prev - 1;
        if (next === 0) addLog("🧪 Stealth Potion effect has worn off!");
        return next;
      });
    }

    if (repelSteps <= 0 && !noEncounterBiomes.has(tileBiome) && Math.random() < diff.encounterRate) {
      const biomeEnemies = ENEMIES_BY_BIOME[tileBiome];
      const fallbackEnemies = ENEMIES_FALLBACK[diff.tier] || ENEMIES_FALLBACK.Beginner;
      const enemyList = biomeEnemies && biomeEnemies.length > 0 ? biomeEnemies : fallbackEnemies;
      const base = pick(enemyList);

      // Enemy level: random within chunk's levelRange (or player level for dynamic chunks)
      let enemyLevel;
      if (diff.isDynamic) {
        // Dynamic chunks: vary ±2 around player level, clamped to 1–50
        const variance = Math.floor(Math.random() * 5) - 2; // -2 to +2
        enemyLevel = Math.max(1, Math.min(50, level + variance));
      } else {
        const [minLv, maxLv] = diff.levelRange;
        enemyLevel = minLv + Math.floor(Math.random() * (maxLv - minLv + 1));
      }

      // Scale formula: exponential growth by enemy level
      const scale = Math.pow(1.13, enemyLevel - 1);
      const rewardScale = Math.pow(1.18, enemyLevel - 1);

      const scaledHp = Math.round(base.hp * scale);
      const en = {
        ...base,
        level: enemyLevel,
        hp: scaledHp,
        maxHp: scaledHp,
        atk: Math.round(base.atk * scale),
        xpRange: [Math.round(base.xpRange[0] * rewardScale), Math.round(base.xpRange[1] * rewardScale)],
        goldRange: [Math.round(base.goldRange[0] * rewardScale), Math.round(base.goldRange[1] * rewardScale)],
      };
      
      // ✅ CRITICAL FIX: Clear all status/buffs from PREVIOUS combat before starting new combat!
      setPlayerStatus({ type: null, duration: 0, damagePerTurn: 0 });
      setEnemyStatus({ type: null, duration: 0, damagePerTurn: 0 });
      setPlayerBuffs({ active: [] });
      setEnemyBuffs({ active: [] });
      setSkillsOpen(false);
      setCombatItemsOpen(false);
      
      setCombatStartPos({ x: pos.x, y: pos.y });  // ✅ NEW: Speichere Start Position
      setSkillsOpen(false);
      setCombatItemsOpen(false);
      setEnemy(en);
      setEnemyHp(en.hp);
      setCombatLog([`A wild ${en.name} appears!`]);
      setScreen("combat");
      addLog(`⚔️ Encountered a ${en.name} (Lv.${en.level})!`);
    }
  }, [pos, cities, caves, defeatedBosses, addLog, repelSteps, level, difficulty]);

  const endCombat = useCallback(() => {
    if (!enemy) return;
    const earnedXp = enemy.isBoss ? enemy.xpReward : randInt(enemy.xpRange[0], enemy.xpRange[1]);
    const earnedGold = enemy.isBoss ? enemy.goldReward : randInt(enemy.goldRange[0], enemy.goldRange[1]);
    const lootItems = enemy.isBoss ? [] : rollLoot(enemy, difficulty.itemLevel);

    // Boss loot drop
    let bossLootItem = null;
    if (enemy.isBoss && enemy.caveKey) {
      // ✅ Get chunk level range from cave key (statt nur itemLevel)
      const [caveX, caveY] = enemy.caveKey.split(',').map(Number);
      const chunk = getChunkTier(caveX, caveY);
      const chunkLevelRange = chunk && chunk.levelRange ? chunk.levelRange : [1, 5];
      bossLootItem = generateBossLoot(chunkLevelRange, enemy.bossBiome, enemy.lootSeed, true);
      setDefeatedBosses(prev => new Set([...prev, enemy.caveKey]));
    }

    setXp(prev => prev + earnedXp);
    setGold(prev => prev + earnedGold);

    if (lootItems.length > 0) {
      setInventory(prev => {
        const filtered = lootItems.filter(li => canAddItem(prev, li));
        return filtered.length > 0 ? [...prev, ...filtered] : prev;
      });
    }
    if (bossLootItem) {
      setInventory(prev => canAddItem(prev, bossLootItem) ? [...prev, bossLootItem] : prev);
    }

    // Update kill quest progress
    setQuests(prev => prev.map(q => {
      if (!q.accepted) return q;
      
      if (q.questKind === "kill" && q.targetEnemy === enemy.name && (q.killCount || 0) < q.targetCount) {
        return { ...q, killCount: (q.killCount || 0) + 1 };
      }
      
      if (q.questKind === "chunkBossHunt" && enemy.isBoss && enemy.caveKey) {
        // ✅ Changed: Accept ANY boss from this region, not specific bosses!
        // Boss cave key format: "chunkX,chunkY" - just check if it matches the target chunk
        const bossBelongsToChunk = enemy.caveKey.startsWith(`${q.targetChunkX},${q.targetChunkY}`);
        if (bossBelongsToChunk && (q.bossKillCount || 0) < q.targetBosses) {
          return { ...q, bossKillCount: (q.bossKillCount || 0) + 1 };
        }
      }
      
      return q;
    }));

    const lootStr = lootItems.length > 0 ? `, and ${lootItems.map(i => {
      if (i.type === "questitem") return `**${i.name}** (Quest Item)`;  // ✅ Quest Item type
      if (i.type === "consumable") return `**${i.name}** (Potion)`;     // ✅ Potion type
      return `**${i.name}** (${i.rarity || "Item"})`;                   // ✅ Equipment: show rarity
    }).join(", ")}` : "";
    const bossLootStr = bossLootItem ? `\n🎁 Boss drop: **${bossLootItem.name}** (${bossLootItem.rarity})!` : "";  // ✅ Bold markup!
    setCombatLog(prev => [...prev, `🏆 Victory! Gained ${earnedXp} XP, ${earnedGold} gold${lootStr}!${bossLootStr}`]);
    
    if (bossLootItem) {
      addLog(`👑 Boss slain! Obtained **${bossLootItem.name}** (${bossLootItem.rarity})!`);  // ✅ Bold markup!
    } else {
      const normalLootLog = lootItems.length > 0 ? ` and ${lootItems.map(i => {
        if (i.type === "questitem") return `**${i.name}** (Quest Item)`;  // ✅ Quest Item type
        if (i.type === "consumable") return `**${i.name}** (Potion)`;     // ✅ Potion type
        return `**${i.name}** (${i.rarity || "Item"})`;                   // ✅ Equipment: show rarity
      }).join(", ")}` : "";
      addLog(`🏆 Defeated ${enemy.name}! +${earnedXp} XP, +${earnedGold} gold${normalLootLog}`);
    }

    // ✅ FIX 2: Cleanup ist jetzt SYNCHRON überall implementiert
    // Status/Buffs werden sofort null gesetzt, nicht asynchron
    // (Das ist jetzt in allen Enemy-Death Szenarien gemacht)
    
    setEnemyHp(0);
    setTimeout(() => { 
      if (combatStartPos) {
        setPos(combatStartPos);  // ✅ Zurück zur Position wo Kampf war
      }
      setScreen("world");
      setEnemy(null);
      setCombatStartPos(null);  // ✅ Cleanup
    }, 1500);
  }, [enemy, difficulty, rollLoot, addLog, combatStartPos]);

  const handlePlayerStatusCheck = useCallback(() => {
    if (playerStatus.type && playerStatus.duration > 0) {
      let damageAmount = playerStatus.damagePerTurn;
      
      // Berechne Schaden basierend auf Status-Typ
      if (playerStatus.type === "burn") {
        damageAmount = Math.ceil(stats.maxHp * 0.10); // 10% HP
      } else if (playerStatus.type === "bleed") {
        damageAmount = Math.ceil(stats.maxHp * 0.07); // 7% HP
      } else if (playerStatus.type === "poison") {
        damageAmount = Math.ceil(stats.maxHp * 0.05); // 5% HP
      } else if (playerStatus.type === "slow") {
        damageAmount = 0; // Slow macht keinen DoT-Schaden
      } else if (playerStatus.type === "stun") {
        damageAmount = 0; // Stun macht keinen Schaden
      }
      
      // ℹ️ Nur Damage-Log wenn Schaden > 0
      if (damageAmount > 0) {
        const damageLog = `${getStatusEmoji(playerStatus.type)} You take ${damageAmount} damage from ${playerStatus.type}!`;
        setCombatLog(prev => [...prev, damageLog]);
        
        // Wende Schaden an
        setHp(prev => {
          const newHp = prev - damageAmount;
          
          // Prüfe auf Tod — vollständiger Death-Flow
          if (newHp <= 0) {
            const goldLost = Math.floor(gold * 0.8);
            const itemsLost = inventory.length;
            setCombatLog(cl => [
              ...cl,
              `💀 You died from ${playerStatus.type}!`,
              `Lost ${goldLost} gold and ${itemsLost} item${itemsLost !== 1 ? "s" : ""}!`,
            ]);
            addLog(`💀 Killed by ${playerStatus.type}! Lost ${goldLost}g and ${itemsLost} items.`);
            setGold(g => g - Math.floor(g * 0.8));
            setInventory([]);
            
            // ✅ FIX 4: Vollständiger Cleanup für ALLE Status/Buffs
            setPlayerStatus({ type: null, duration: 0, damagePerTurn: 0 });
            setEnemyStatus({ type: null, duration: 0, damagePerTurn: 0 });
            setPlayerBuffs({ active: [] });
            setEnemyBuffs({ active: [] });
            
            const respawnCity = lastCity ? lastCity.name : null;
            setTimeout(() => {
              setDeathPopup({
                enemyName: playerStatus.type,
                story: getDeathStory(playerStatus.type, playerName),
                goldLost, itemsLost, respawnCity,
                onContinue: () => {
                  setDeathPopup(null);
                  if (lastCity) {
                    setPos({ x: lastCity.x, y: lastCity.y });
                    setCurrentCity(lastCity);
                    setScreen("city");
                  } else {
                    setPos({ x: startX, y: startY });
                    const spawnCityKey = `${startX},${startY}`;
                    if (cities[spawnCityKey]) {
                      setCurrentCity(cities[spawnCityKey]);
                      setLastCity(cities[spawnCityKey]);
                      setVisitedCities(prev => new Set([...prev, cities[spawnCityKey].name]));  // ✅ Mark as visited
                      setScreen("city");
                    } else {
                      setScreen("world");
                    }
                  }
                  setEnemy(null);
                },
              });
            }, 600);
            return stats.maxHp;
          }
          return newHp;
        });
      } else {
        // Slow & Stun: Nur Status-Info ohne Schaden
        const statusLog = playerStatus.type === "slow" 
          ? `❄️ You are slowed!` 
          : `😵 You are stunned!`;
        setCombatLog(prev => [...prev, statusLog]);
      }
      
      // ✅ FIX 3: Konsistente Duration-Reduktion Pattern
      setPlayerStatus(prev => {
        const newDuration = Math.max(0, prev.duration - 1);
        return {
          ...prev,
          duration: newDuration,
          type: newDuration <= 0 ? null : prev.type
        };
      });
      
      return true; // Status war aktiv
    }
    return false; // Kein Status
  }, [playerStatus, stats.maxHp, gold, inventory, lastCity, startX, startY, cities, playerName, addLog]);

  const handleEnemyStatusCheck = useCallback(() => {
    if (!enemy) return { handled: false, newHp: enemyHp };
    if (enemyStatus.type && enemyStatus.duration > 0) {
      let damageAmount = enemyStatus.damagePerTurn;
      
      // Berechne Schaden basierend auf Status-Typ
      if (enemyStatus.type === "burn") {
        damageAmount = Math.ceil(enemy.maxHp * 0.10); // 10% HP
      } else if (enemyStatus.type === "bleed") {
        damageAmount = Math.ceil(enemy.maxHp * 0.07); // 7% HP
      } else if (enemyStatus.type === "poison") {
        damageAmount = Math.ceil(enemy.maxHp * 0.05); // 5% HP
      } else if (enemyStatus.type === "slow") {
        damageAmount = 0; // Slow macht keinen DoT-Schaden
      } else if (enemyStatus.type === "stun") {
        damageAmount = 0; // Stun macht keinen Schaden
      }
      
      // 🔴 DEBUG LOG
      console.log("=== handleEnemyStatusCheck DEBUG ===");
      console.log("enemyStatus:", enemyStatus);
      console.log("enemy:", enemy);
      console.log("enemy.maxHp:", enemy?.maxHp);
      console.log("damageAmount calculated:", damageAmount);
      console.log("enemyHp BEFORE:", enemyHp);
      
      // ℹ️ Nur Damage-Log wenn Schaden > 0
      if (damageAmount > 0) {
        const damageLog = `${getStatusEmoji(enemyStatus.type)} ${enemy.name} takes ${damageAmount} damage from ${enemyStatus.type}!`;
        setCombatLog(prev => [...prev, damageLog]);
        
        // Wende Schaden an
        const newHp = enemyHp - damageAmount;
        console.log("newHp calculated (enemyHp - damageAmount):", newHp);
        setEnemyHp(Math.max(0, newHp));
        console.log("enemyHp AFTER setEnemyHp:", Math.max(0, newHp));
        
        // Prüfe auf Tod NACH HP-Berechnung
        if (newHp <= 0) {
          setCombatLog(cl => [...cl, `💀 ${enemy.name} died from ${enemyStatus.type}!`]);
          
          // ✅ FIX 1 & 2: Sofortiger Status-Cleanup (synchron!)
          // Status wird SOFORT null gesetzt, nicht nach 100ms
          setPlayerStatus({ type: null, duration: 0, damagePerTurn: 0 });
          setEnemyStatus({ type: null, duration: 0, damagePerTurn: 0 });
          setPlayerBuffs({ active: [] });
          setEnemyBuffs({ active: [] });
          
          // Screen-Wechsel später
          setTimeout(() => { 
            setScreen("world"); 
            setEnemy(null); 
          }, 1500);
          
          console.log("✅ Enemy killed by status effect - cleanup triggered immediately (not async)");
          console.log("=== END DEBUG ===\n");
          
          return { handled: true, newHp: Math.max(0, newHp), killed: true };
        }
      } else {
        // Slow & Stun: Nur Status-Info ohne Schaden
        console.log("damageAmount was 0 or less, no damage applied. enemyHp stays:", enemyHp);
        const statusLog = enemyStatus.type === "slow" 
          ? `❄️ ${enemy.name} is slowed!` 
          : `😵 ${enemy.name} is stunned!`;
        setCombatLog(prev => [...prev, statusLog]);
      }
      
      // ✅ FIX 3: Konsistentes Duration-Decrement Pattern
      // Nutze Math.max(0, ...) überall für consistency
      setEnemyStatus(prev => {
        const newDuration = Math.max(0, prev.duration - 1);
        return {
          ...prev,
          duration: newDuration,
          type: newDuration <= 0 ? null : prev.type
        };
      });
      
      console.log("Duration reduced to:", Math.max(0, enemyStatus.duration - 1));
      console.log("=== END DEBUG ===\n");
      
      // ✅ WICHTIG: Return den AKTUELLEN enemyHp statt zu hoffen dass State aktualisiert wird!
      return { handled: true, newHp: enemyHp, killed: false };
    }
    return { handled: false, newHp: enemyHp };
  }, [enemyStatus, enemy, endCombat]);

  const applyPlayerStatus = useCallback((statusType, duration, damagePerTurn) => {
    // ✅ Nur wenn Player keinen Status hat - AKTUELLER playerStatus wird gecheckt
    setPlayerStatus(prevStatus => {
      if (!prevStatus.type) {
        setCombatLog(prev => [...prev, `${getStatusEmoji(statusType)} You are affected by ${statusType}!`]);
        return {
          type: statusType,
          duration: duration,
          damagePerTurn: damagePerTurn
        };
      } else {
        // ❌ Status wird ignoriert - Player hat bereits Status
        setCombatLog(prev => [...prev, `🛡️ You resist the status!`]);
        return prevStatus; // Status bleibt unverändert
      }
    });
  }, []);

  const applyEnemyStatus = useCallback((statusType, duration, damagePerTurn) => {
    if (!enemy) return false;
    console.log("🔴 applyEnemyStatus called:", { statusType, duration, damagePerTurn, enemy: enemy?.name });
    // ✅ Nur wenn Enemy keinen Status hat - AKTUELLER enemyStatus wird gecheckt
    setEnemyStatus(prevStatus => {
      if (!prevStatus.type) {
        console.log("✅ Status applied successfully:", statusType);
        setCombatLog(prev => [...prev, `${getStatusEmoji(statusType)} ${enemy.name} is affected by ${statusType}!`]);
        return {
          type: statusType,
          duration: duration,
          damagePerTurn: damagePerTurn
        };
      } else {
        // ❌ Status wird ignoriert - Enemy hat bereits Status
        console.log("❌ Status resisted! Enemy already has:", prevStatus.type);
        setCombatLog(prev => [...prev, `🛡️ ${enemy.name} resists the status!`]);
        return prevStatus; // Status bleibt unverändert
      }
    });
  }, [enemy]);

  // ✅ NEW: BUFF SYSTEM FUNKTIONEN

  const applyPlayerBuff = useCallback((buffType, duration, charges = 0) => {
    console.log("✅ applyPlayerBuff:", { buffType, duration, charges });
    setPlayerBuffs(prev => {
      // Entferne alte Buff des gleichen Typs wenn vorhanden
      const filtered = prev.active.filter(b => b.type !== buffType);
      return {
        active: [...filtered, { type: buffType, duration, charges }]
      };
    });
    
    const buffNames = { critBoost: "Crit Boost", defense: "Defense Boost", stealth: "Stealth" };
    const buffEmojis = { critBoost: "⚡", defense: "🛡️", stealth: "🌀" };
    const durationText = charges > 0 ? `${charges} Attacks` : `${duration} Rounds`;
    setCombatLog(prev => [...prev, `${buffEmojis[buffType]} ${buffNames[buffType]} aktiviert! ${durationText}!`]);
  }, []);

  const applyEnemyBuff = useCallback((buffType, duration, charges = 0) => {
    console.log("✅ applyEnemyBuff:", { buffType, duration, charges });
    setEnemyBuffs(prev => {
      const filtered = prev.active.filter(b => b.type !== buffType);
      return {
        active: [...filtered, { type: buffType, duration, charges }]
      };
    });
    
    // ✅ FIX: Konsistentes Logging wie bei Player
    const buffNames = { critBoost: "Crit Boost", defense: "Defense Boost", stealth: "Stealth" };
    const buffEmojis = { critBoost: "⚡", defense: "🛡️", stealth: "🌀" };
    const durationText = charges > 0 ? `${charges} Attacks` : `${duration} Rounds`;
    setCombatLog(prev => [...prev, `${buffEmojis[buffType]} ${enemy?.name || 'Enemy'} ${buffNames[buffType]} aktiviert! ${durationText}!`]);
  }, [enemy, setCombatLog]);

  const handlePlayerBuffDecrement = useCallback(() => {
    setPlayerBuffs(prev => {
      // ✅ FIX: Konsistente Duration-Reduktion Pattern
      const updated = prev.active
        .map(buff => ({ 
          ...buff, 
          duration: Math.max(0, buff.duration - 1) 
        }))
        .filter(buff => buff.duration > 0);
      
      // Finde welche Buffs entfernt wurden (vorher > 0, nachher <= 0)
      const removed = prev.active.find(b => {
        const mapped = { ...b, duration: Math.max(0, b.duration - 1) };
        return mapped.duration <= 0;
      });
      
      if (removed && updated.length < prev.active.length) {
        const buffEmojis = { critBoost: "⚡", defense: "🛡️", stealth: "🌀" };
        const emoji = buffEmojis[removed.type] || "✨";
        setCombatLog(prevLog => [...prevLog, `${emoji} Your ${removed.type} Buff ended!`]);
      }
      
      return { active: updated };
    });
  }, [setCombatLog]);

  const handleEnemyBuffDecrement = useCallback(() => {
    setEnemyBuffs(prev => {
      // ✅ FIX: Konsistente Duration-Reduktion Pattern
      const updated = prev.active
        .map(buff => ({ 
          ...buff, 
          duration: Math.max(0, buff.duration - 1) 
        }))
        .filter(buff => buff.duration > 0);
      return { active: updated };
    });
  }, []);

  const learnAbility = useCallback((abilityId, type) => {
    if (type === "spell") {
      setLearnedAbilities(prev => ({ ...prev, spells: [...prev.spells, abilityId] }));
      const spell = SPELLS.find(s => s.id === abilityId);
      addLog(`✨ Learned spell: ${spell.name}!`);
    } else if (type === "special") {
      setLearnedAbilities(prev => ({ ...prev, specials: [...prev.specials, abilityId] }));
      const special = SPECIALS.find(s => s.id === abilityId);
      addLog(`⚡ Learned special: ${special.name}!`);
    }
    setAbilityChoicePopup(null);
  }, [addLog]);

  // ✅ REF für applyStatusDamagePerTurn - wird am Ende definiert, aber Ref wird hier erstellt
  const applyStatusDamagePerTurnRef = useRef(null);

  const castSpell = useCallback((spellId) => {
    if (!enemy || enemyHp <= 0) return;
    
    // ✅ NEW: Buff Decrement
    handlePlayerBuffDecrement();
    
    const spell = SPELLS.find(s => s.id === spellId);
    if (!spell) return;
    if (mana < spell.manaCost) {
      setCombatLog(prev => [...prev, `🔴 Not enough mana! (Have ${mana}, need ${spell.manaCost})`]);
      return;
    }

    // SPIELER-ZYKLUS: Prüfe Spieler-Status
    if (handlePlayerStatusCheck()) {
      // Spieler hat Status - kann agieren aber Status wird angewendet
    }

    setMana(prev => prev - spell.manaCost);
    let totalDmg = 0;
    let logMsg = `✨ Cast ${spell.name}! `;

    // ✅ NEW: Prüfe Crit Boost für Spells
    const critBoostBuff = playerBuffs.active.find(b => b.type === "critBoost");
    let isCrit = false;

    if (spell.hitCount) {
      for (let i = 0; i < spell.hitCount; i++) {
        const baseDmg = randInt(spell.dmgRange[0], spell.dmgRange[1]);
        const equipBonus = Math.floor(stats.damage * 0.5);
        const dmg = baseDmg + equipBonus;
        totalDmg += dmg;
      }
      logMsg += `${totalDmg} damage (${spell.hitCount}x)!`;
    } else if (spell.effect === "playerHeal") {
      const healAmount = Math.floor(Math.random() * (spell.dmgRange[1] - spell.dmgRange[0] + 1)) + spell.dmgRange[0];
      setHp(prev => Math.min(prev + healAmount, stats.maxHp));
      logMsg += `Healed ${healAmount} HP!`;
      
      // ✅ VISUAL: Floating Heal Text IM GRÜNEN KREIS (Player, oben links)
      const playerX = 150;  // Grünen Kreis Mitte X
      const playerY = 130;  // Grünen Kreis Mitte Y
      addFloatingDamage(`+${healAmount}`, playerX, playerY, false, true);
      
      setCombatLog(prev => [...prev, logMsg]);
      return;
    } else {
      const baseDmg = randInt(spell.dmgRange[0], spell.dmgRange[1]);
      const equipBonus = Math.floor(stats.damage * 0.5);
      totalDmg = baseDmg + equipBonus;
      
      // Prüfe Crit
      if (critBoostBuff && critBoostBuff.charges > 0) {
        isCrit = true;
        setPlayerBuffs(prev => ({
          active: prev.active.map(b => 
            b.type === "critBoost" ? { ...b, charges: b.charges - 1 } : b
          ).filter(b => b.charges > 0 || b.type !== "critBoost")
        }));
      } else {
        isCrit = Math.random() < stats.critChance;
      }
      
      if (isCrit) totalDmg *= 1.5;
      logMsg += `${totalDmg} damage!`;
    }

    setCombatLog(prev => [...prev, logMsg]);
    const newEnemyHp = enemyHp - totalDmg;
    setEnemyHp(Math.max(0, newEnemyHp));

    // ✅ VISUAL: Floating Damage Text IM ROTEN KREIS (Enemy, oben rechts)
    const enemyX = 450;  // Roten Kreis Mitte X
    const enemyY = 130;  // Roten Kreis Mitte Y
    addFloatingDamage(Math.round(totalDmg), enemyX, enemyY, isCrit);

    // Check if enemy is defeated
    if (newEnemyHp <= 0) {
      setCombatLog(prev => [...prev, `💀 ${enemy.name} has been defeated!`]);
      
      // ✅ Sofortiger Cleanup (synchron)
      setPlayerStatus({ type: null, duration: 0, damagePerTurn: 0 });
      setEnemyStatus({ type: null, duration: 0, damagePerTurn: 0 });
      setPlayerBuffs({ active: [] });
      setEnemyBuffs({ active: [] });
      
      setTimeout(() => { setScreen("world"); setEnemy(null); }, 1500);
      return;
    }

    if (spell.effect === "slow") {
      // Slow: 50% weniger Schaden für 3 Runden
      if (newEnemyHp > 0) {
        applyEnemyStatus("slow", 3, 0);
      }
    } else if (spell.effect === "heal") {
      const healAmount = Math.floor(totalDmg * spell.healPercent);
      setHp(prev => Math.min(prev + healAmount, stats.maxHp));
      setCombatLog(prev => [...prev, `💚 Lifesteal: ${healAmount} HP!`]);
    } else if (spell.effect === "burn") {
      // Burn: 10% HP für 2 Runden
      if (newEnemyHp > 0) {
        applyEnemyStatus("burn", 2, 0);
      }
    } else if (spell.effect === "dodge") {
      // ✅ NEW: Time Warp gibt Stealth Buff
      applyPlayerBuff("stealth", 2);
    }

    setTimeout(() => {
      // ✅ NEW: Enemy Buff Decrement vor Counter-Attack
      handleEnemyBuffDecrement();
      
      // ✅ NEW: Apply Status Damage FIRST before enemy counter-attack
      applyStatusDamagePerTurnRef.current?.();
      
      // ❌ NUR STUN blockiert die Attacke!
      if (enemyStatus.type === "stun" && enemyStatus.duration > 0) {
        setCombatLog(prev => [...prev, `😵 ${enemy.name} is stunned and cannot attack!`]);
        return;
      }

      // ✅ NEW: Prüfe Stealth Buff
      const stealthBuff = playerBuffs.active.find(b => b.type === "stealth");
      if (stealthBuff && stealthBuff.duration > 0) {
        setCombatLog(prev => [...prev, `🌀 ${enemy.name}'s attack missed! (You are in stealth)`]);
        return;
      }

      const dodged = Math.random() < stats.dodgeChance;
      if (dodged) {
        setCombatLog(prev => [...prev, `🌀 ${enemy.name} missed!`]);
        return;
      }
      let enemyDmg = calcEnemyDamage(enemy.atk, stats.defense);
      
      // ✅ NEW: Defense Buff
      const defenseBuff = playerBuffs.active.find(b => b.type === "defense");
      let buffedDefense = stats.defense;
      if (defenseBuff && defenseBuff.duration > 0) {
        const defenseBonus = Math.floor(stats.defense * 0.5);
        buffedDefense = stats.defense + defenseBonus;
        enemyDmg = calcEnemyDamage(enemy.atk, buffedDefense);
        const blockedDmg = calcEnemyDamage(enemy.atk, stats.defense) - enemyDmg;
        setCombatLog(prev => [...prev, `🛡️ Defense Buff blocks ${blockedDmg} damage! Reduced to ${enemyDmg}`]);
      }
      
      // ❄️ SLOW: 50% weniger Schaden wenn Enemy von Slow betroffen
      if (enemyStatus.type === "slow") {
        enemyDmg = Math.floor(enemyDmg * 0.5);
        setCombatLog(prev => [...prev, `❄️ ${enemy.name}'s attack is slowed! Reduced damage: ${enemyDmg}`]);
      }
      
      setHp(prev => {
        const newHp = prev - enemyDmg;
        if (newHp <= 0) {
          // ✅ NEW: Entferne Status/Buffs beim Defeat
          setPlayerStatus({ type: null, duration: 0, damagePerTurn: 0 });
          setEnemyStatus({ type: null, duration: 0, damagePerTurn: 0 });
          setPlayerBuffs({ active: [] });
          setEnemyBuffs({ active: [] });
          
          setCombatLog(cl => [...cl, `${enemy.name} deals ${enemyDmg} damage!`, `💀 You have been defeated!`]);
          return stats.maxHp;
        }
        setCombatLog(cl => [...cl, `${enemy.name} deals ${enemyDmg} damage!`]);
        return newHp;
      });
    }, 400);
  }, [enemy, enemyHp, mana, stats, endCombat, handlePlayerStatusCheck, handleEnemyStatusCheck, applyEnemyStatus, enemyStatus, playerStatus, playerBuffs, handlePlayerBuffDecrement, applyPlayerBuff, setPlayerStatus, setEnemyStatus, setPlayerBuffs, setEnemyBuffs, handleEnemyBuffDecrement]);

  const useSpecial = useCallback((specialId) => {
    if (!enemy || enemyHp <= 0) return;
    
    // ✅ NEW: Buff Decrement
    handlePlayerBuffDecrement();
    
    const special = SPECIALS.find(s => s.id === specialId);
    if (!special) return;

    const hpCost = Math.ceil(hp * special.hpCostPercent);
    if (hp - hpCost <= 1) {
      setCombatLog(prev => [...prev, `🔴 Not enough HP! (Have ${hp}, need ${hpCost})`]);
      return;
    }

    // SPIELER-ZYKLUS: Prüfe Spieler-Status
    if (handlePlayerStatusCheck()) {
      // Spieler hat Status - kann agieren aber Status wird angewendet
    }

    setHp(prev => Math.max(1, prev - hpCost));
    let totalDmg = 0;
    let logMsg = `⚡ Used ${special.name}! `;

    // ✅ NEW: Prüfe Crit Boost für Specials
    const critBoostBuff = playerBuffs.active.find(b => b.type === "critBoost");
    let isCrit = false;

    if (special.hitCount) {
      for (let i = 0; i < special.hitCount; i++) {
        const baseDmg = randInt(special.dmgRange[0], special.dmgRange[1]);
        const equipBonus = stats.damage;
        const dmg = baseDmg + equipBonus;
        totalDmg += dmg;
      }
      logMsg += `${totalDmg} damage (${special.hitCount}x)!`;
    } else {
      const baseDmg = randInt(special.dmgRange[0], special.dmgRange[1]);
      const equipBonus = stats.damage;
      totalDmg = baseDmg + equipBonus;
      
      // Prüfe Crit
      if (critBoostBuff && critBoostBuff.charges > 0) {
        isCrit = true;
        setPlayerBuffs(prev => ({
          active: prev.active.map(b => 
            b.type === "critBoost" ? { ...b, charges: b.charges - 1 } : b
          ).filter(b => b.charges > 0 || b.type !== "critBoost")
        }));
      } else {
        isCrit = Math.random() < stats.critChance;
      }
      
      if (isCrit) totalDmg *= 1.5;
      logMsg += `${totalDmg} damage!`;
    }

    logMsg += ` (Costs ${hpCost} HP)`;
    setCombatLog(prev => [...prev, logMsg]);
    const newEnemyHp = enemyHp - totalDmg;
    setEnemyHp(Math.max(0, newEnemyHp));

    // ✅ VISUAL: Floating Damage Text IM ROTEN KREIS (Enemy, oben rechts)
    const enemyX = 450;  // Roten Kreis Mitte X
    const enemyY = 130;  // Roten Kreis Mitte Y
    addFloatingDamage(Math.round(totalDmg), enemyX, enemyY, isCrit);

    // Check if enemy is defeated
    if (newEnemyHp <= 0) {
      setCombatLog(prev => [...prev, `💀 ${enemy.name} has been defeated!`]);
      
      // ✅ Sofortiger Cleanup (synchron)
      setPlayerStatus({ type: null, duration: 0, damagePerTurn: 0 });
      setEnemyStatus({ type: null, duration: 0, damagePerTurn: 0 });
      setPlayerBuffs({ active: [] });
      setEnemyBuffs({ active: [] });
      
      setTimeout(() => { setScreen("world"); setEnemy(null); }, 1500);
      return;
    }

    if (special.effect === "bleed") {
      // Bleed: 7% HP für 3 Runden
      console.log("🩸 BLEED SPECIAL USED:", { 
        specialName: special.name,
        enemyName: enemy.name,
        enemyHpBefore: newEnemyHp,
        willApplyStatus: newEnemyHp > 0
      });
      if (newEnemyHp > 0) {
        applyEnemyStatus("bleed", 3, 0);
      }
    } else if (special.effect === "crit") {
      // ✅ NEW: Berserk/Overdrive geben Crit Boost
      applyPlayerBuff("critBoost", 2, 2);
    } else if (special.effect === "defense") {
      // ✅ NEW: Shield Bash gibt Defense Boost
      applyPlayerBuff("defense", 2);
    } else if (special.effect === "heal") {
      const healAmount = Math.floor(totalDmg * special.healPercent);
      setHp(prev => Math.min(prev + healAmount, stats.maxHp));
      setCombatLog(prev => [...prev, `💪 Regained ${healAmount} HP!`]);
    } else if (special.effect === "reflect") {
      setCombatLog(prev => [...prev, `🌹 Reflecting damage!`]);
    } else if (special.effect === "stun") {
      // Stun: Kann nicht agieren für 2 Runden
      if (newEnemyHp > 0) {
        applyEnemyStatus("stun", 2, 0);
      }
    } else if (special.effect === "poison") {
      // Poison: 5% HP für 5 Runden
      if (newEnemyHp > 0) {
        applyEnemyStatus("poison", 5, 0);
      }
    }

    setTimeout(() => {
      // ✅ NEW: Enemy Buff Decrement vor Counter-Attack
      handleEnemyBuffDecrement();
      
      // ✅ NEW: Apply Status Damage FIRST before enemy counter-attack
      applyStatusDamagePerTurnRef.current?.();
      
      // ❌ NUR STUN blockiert die Attacke!
      if (enemyStatus.type === "stun" && enemyStatus.duration > 0) {
        setCombatLog(prev => [...prev, `😵 ${enemy.name} is stunned and cannot attack!`]);
        return;
      }
      
      // ✅ NEW: Prüfe Stealth Buff
      const stealthBuff = playerBuffs.active.find(b => b.type === "stealth");
      if (stealthBuff && stealthBuff.duration > 0) {
        setCombatLog(prev => [...prev, `🌀 ${enemy.name}'s attack missed! (You are in stealth)`]);
        return;
      }
      
      const dodged = Math.random() < stats.dodgeChance;
      if (dodged) {
        setCombatLog(prev => [...prev, `🌀 ${enemy.name} missed!`]);
        return;
      }
      
      let enemyDmg = calcEnemyDamage(enemy.atk, stats.defense);
      
      // ✅ NEW: Defense Buff
      const defenseBuff = playerBuffs.active.find(b => b.type === "defense");
      let buffedDefense = stats.defense;
      if (defenseBuff && defenseBuff.duration > 0) {
        const defenseBonus = Math.floor(stats.defense * 0.5);
        buffedDefense = stats.defense + defenseBonus;
        enemyDmg = calcEnemyDamage(enemy.atk, buffedDefense);
        const blockedDmg = calcEnemyDamage(enemy.atk, stats.defense) - enemyDmg;
        setCombatLog(prev => [...prev, `🛡️ Defense Buff blocks ${blockedDmg} damage! Reduced to ${enemyDmg}`]);
      }
      
      // 4️⃣ SLOW reduziert Schaden
      if (enemyStatus.type === "slow") {
        enemyDmg = Math.floor(enemyDmg * 0.5);
        setCombatLog(prev => [...prev, `❄️ ${enemy.name}'s attack is slowed! Reduced damage: ${enemyDmg}`]);
      }
      
      setHp(prev => {
        const newHp = prev - enemyDmg;
        if (newHp <= 0) {
          setCombatLog(cl => [...cl, `${enemy.name} deals ${enemyDmg} damage!`, `💀 You have been defeated!`]);
          return stats.maxHp;
        }
        setCombatLog(cl => [...cl, `${enemy.name} deals ${enemyDmg} damage!`]);
        return newHp;
      });
    }, 400);
  }, [enemy, enemyHp, hp, stats, endCombat, handlePlayerStatusCheck, handleEnemyStatusCheck, applyEnemyStatus, playerBuffs, handleEnemyBuffDecrement]);

  // ✅ NEW: Unified Status Damage Function - wird bei JEDEM Turn aufgerufen
  // Anwendet Schaden für BEIDE: Spieler und Enemy
  const applyStatusDamagePerTurn = useCallback(() => {
    console.log("🔴 applyStatusDamagePerTurn CALLED");
    console.log("   enemyStatus:", enemyStatus);
    console.log("   playerStatus:", playerStatus);
    
    let enemyStatusDmg = 0;
    let playerStatusDmg = 0;
    const logs = [];
    
    // 🔴 ENEMY STATUS SCHADEN - Berechne zuerst, DANN wende an
    if (enemy && enemyStatus.type && enemyStatus.duration > 0) {
      console.log("   → Applying ENEMY status damage");
      
      if (enemyStatus.type === "burn") {
        enemyStatusDmg = Math.ceil(enemy.maxHp * 0.10); // 10% Max HP
      } else if (enemyStatus.type === "bleed") {
        enemyStatusDmg = Math.ceil(enemy.maxHp * 0.07); // 7% Max HP
      } else if (enemyStatus.type === "poison") {
        enemyStatusDmg = Math.ceil(enemy.maxHp * 0.05); // 5% Max HP
      }
      // Slow & Stun machen keinen DoT-Schaden
      
      if (enemyStatusDmg > 0) {
        console.log(`   → Enemy takes ${enemyStatusDmg} damage from ${enemyStatus.type}`);
        logs.push(`${getStatusEmoji(enemyStatus.type)} ${enemy.name} takes ${enemyStatusDmg} damage from ${enemyStatus.type}!`);
        setEnemyHp(prev => {
          const newHp = Math.max(0, prev - enemyStatusDmg);
          console.log(`   → Enemy HP: ${prev} - ${enemyStatusDmg} = ${newHp}`);
          if (newHp <= 0) {
            logs.push(`💀 ${enemy.name} died from ${enemyStatus.type}!`);
            endCombat();
          }
          return newHp;
        });
      }
      
      // ✅ Duration reduzieren - SEPARATE setState für Duration
      console.log(`   → Reducing enemy status duration from ${enemyStatus.duration} to ${enemyStatus.duration - 1}`);
      setEnemyStatus(prev => {
        const newDuration = Math.max(0, prev.duration - 1);
        return {
          ...prev,
          duration: newDuration,
          type: newDuration <= 0 ? null : prev.type
        };
      });
    }
    
    // 🔵 PLAYER STATUS SCHADEN - Berechne zuerst, DANN wende an
    if (playerStatus.type && playerStatus.duration > 0) {
      console.log("   → Applying PLAYER status damage");
      
      if (playerStatus.type === "burn") {
        playerStatusDmg = Math.ceil(stats.maxHp * 0.10); // 10% Max HP
      } else if (playerStatus.type === "bleed") {
        playerStatusDmg = Math.ceil(stats.maxHp * 0.07); // 7% Max HP
      } else if (playerStatus.type === "poison") {
        playerStatusDmg = Math.ceil(stats.maxHp * 0.05); // 5% Max HP
      }
      // Slow & Stun machen keinen DoT-Schaden
      
      if (playerStatusDmg > 0) {
        console.log(`   → Player takes ${playerStatusDmg} damage from ${playerStatus.type}`);
        logs.push(`${getStatusEmoji(playerStatus.type)} You take ${playerStatusDmg} damage from ${playerStatus.type}!`);
        setHp(prev => Math.max(0, prev - playerStatusDmg));
      }
      
      // ✅ Duration reduzieren - SEPARATE setState für Duration
      console.log(`   → Reducing player status duration from ${playerStatus.duration} to ${playerStatus.duration - 1}`);
      setPlayerStatus(prev => {
        const newDuration = Math.max(0, prev.duration - 1);
        return {
          ...prev,
          duration: newDuration,
          type: newDuration <= 0 ? null : prev.type
        };
      });
    }
    
    // ✅ Logs hinzufügen wenn Status-Schaden angewendet wurde
    if ((enemyStatusDmg > 0 || playerStatusDmg > 0) && logs.length > 0) {
      console.log("   → Adding logs to combat log:", logs);
      setCombatLog(prev => [...prev, ...logs]);
    }
    console.log("🔴 applyStatusDamagePerTurn DONE\n");
  }, [enemy, stats, endCombat, enemyStatus.type, enemyStatus.duration, playerStatus.type, playerStatus.duration]);

  // ✅ Update Ref wenn Funktion sich ändert
  useEffect(() => {
    applyStatusDamagePerTurnRef.current = applyStatusDamagePerTurn;
  }, [applyStatusDamagePerTurn]);

  // ✅ SAFETY NET: Wenn Kampf endet (enemy === null), lösche alle Status/Buffs
  // Das ist ein Sicherheitsnetz falls andere Pfade nicht löschen
  useEffect(() => {
    if (enemy === null && screen !== "combat") {
      console.log("🛡️ SAFETY NET: Clearing all status/buffs because combat ended");
      setPlayerStatus({ type: null, duration: 0, damagePerTurn: 0 });
      setEnemyStatus({ type: null, duration: 0, damagePerTurn: 0 });
      setPlayerBuffs({ active: [] });
      setEnemyBuffs({ active: [] });
    }
  }, [enemy, screen]);

  const attack = useCallback(() => {
    if (!enemy) return;
    
    // ✅ NEW: Buff Decrement am Anfang der Runde
    handlePlayerBuffDecrement();
    
    // SPIELER-ZYKLUS: Prüfe Spieler-Status
    if (handlePlayerStatusCheck()) {
      // Spieler hat Status - kann agieren aber Status wird angewendet
    }
    
    // ✅ NEW: Prüfe Crit Boost Buff
    const critBoostBuff = playerBuffs.active.find(b => b.type === "critBoost");
    let isCrit = false;
    let playerDmg = Math.max(1, stats.damage + randInt(-2, 2));
    
    if (critBoostBuff && critBoostBuff.charges > 0) {
      // Garantierter Crit!
      isCrit = true;
      console.log("⚡ Crit Boost aktiviert! Guaranteed Crit!");
      // Charges reduzieren
      setPlayerBuffs(prev => ({
        active: prev.active.map(b => 
          b.type === "critBoost" ? { ...b, charges: b.charges - 1 } : b
        ).filter(b => b.charges > 0 || b.type !== "critBoost")
      }));
    } else {
      // Normal Crit-Chance
      isCrit = Math.random() < stats.critChance;
    }
    
    if (isCrit) playerDmg *= 1.5;
    
    // ❄️ SLOW: 50% weniger Schaden wenn Spieler von Slow betroffen
    if (playerStatus.type === "slow") {
      playerDmg = Math.floor(playerDmg * 0.5);
      setCombatLog(prev => [...prev, `❄️ Your attack is slowed! Reduced damage: ${playerDmg}`]);
    }
    
    const newEnemyHp = enemyHp - playerDmg;
    const newCombatLog = [...combatLog, isCrit
      ? `💥 CRITICAL HIT! You deal ${playerDmg} damage to ${enemy.name}!`
      : `You deal ${playerDmg} damage to ${enemy.name}!`
    ];

    // ✅ VISUAL: Floating Damage Text IM ROTEN KREIS (Enemy, oben rechts)
    const enemyX = 450;  // Roten Kreis Mitte X
    const enemyY = 130;  // Roten Kreis Mitte Y
    addFloatingDamage(playerDmg, enemyX, enemyY, isCrit);

    if (newEnemyHp <= 0) {
      const earnedXp = enemy.isBoss ? enemy.xpReward : randInt(enemy.xpRange[0], enemy.xpRange[1]);
      const earnedGold = enemy.isBoss ? enemy.goldReward : randInt(enemy.goldRange[0], enemy.goldRange[1]);
      const lootItems = enemy.isBoss ? [] : rollLoot(enemy, difficulty.itemLevel);

      // Boss loot drop
      let bossLootItem = null;
      if (enemy.isBoss && enemy.caveKey) {
        // ✅ Get chunk level range from cave key (statt nur itemLevel)
        const [caveX, caveY] = enemy.caveKey.split(',').map(Number);
        const chunk = getChunkTier(caveX, caveY);
        const chunkLevelRange = chunk && chunk.levelRange ? chunk.levelRange : [1, 5];
        bossLootItem = generateBossLoot(chunkLevelRange, enemy.bossBiome, enemy.lootSeed, true);
        setDefeatedBosses(prev => new Set([...prev, enemy.caveKey]));
      }

      setXp(prev => prev + earnedXp);
      setGold(prev => prev + earnedGold);

      if (lootItems.length > 0) {
        setInventory(prev => {
          const filtered = lootItems.filter(li => canAddItem(prev, li));
          return filtered.length > 0 ? [...prev, ...filtered] : prev;
        });
      }
      if (bossLootItem) {
        setInventory(prev => canAddItem(prev, bossLootItem) ? [...prev, bossLootItem] : prev);
      }

      // Update kill quest progress (moved to first endCombat section)

      const lootStr = lootItems.length > 0 ? `, and ${lootItems.map(i => {
        if (i.type === "questitem") return `**${i.name}** (Quest Item)`;  // ✅ Quest Item type
        if (i.type === "consumable") return `**${i.name}** (Potion)`;     // ✅ Potion type
        return `**${i.name}** (${i.rarity || "Item"})`;                   // ✅ Equipment: show rarity
      }).join(", ")}` : "";
      const bossLootStr = bossLootItem ? `\n🎁 Boss drop: **${bossLootItem.name}** (${bossLootItem.rarity})!` : "";  // ✅ Bold markup!
      newCombatLog.push(`🏆 Victory! Gained ${earnedXp} XP, ${earnedGold} gold${lootStr}!${bossLootStr}`);
      if (bossLootItem) {
        addLog(`👑 Boss slain! Obtained **${bossLootItem.name}** (${bossLootItem.rarity})!`);  // ✅ Bold markup!
      } else {
        const normalLootLog = lootItems.length > 0 ? ` and ${lootItems.map(i => {
          if (i.type === "questitem") return `**${i.name}** (Quest Item)`;  // ✅ Quest Item type
          if (i.type === "consumable") return `**${i.name}** (Potion)`;     // ✅ Potion type
          return `**${i.name}** (${i.rarity || "Item"})`;                   // ✅ Equipment: show rarity
        }).join(", ")}` : "";
        addLog(`🏆 Defeated ${enemy.name}! +${earnedXp} XP, +${earnedGold} gold${normalLootLog}`);
      }

      setCombatLog(newCombatLog);
      setEnemyHp(0);
      
      // ✅ Sofortiger Cleanup (synchron)
      setPlayerStatus({ type: null, duration: 0, damagePerTurn: 0 });
      setEnemyStatus({ type: null, duration: 0, damagePerTurn: 0 });
      setPlayerBuffs({ active: [] });
      setEnemyBuffs({ active: [] });
      
      setTimeout(() => { setScreen("world"); setEnemy(null); }, 1500);
      return;
    }

    setEnemyHp(newEnemyHp);

    // ✅ NEW: Enemy Buff Decrement vor Counter-Attack
    handleEnemyBuffDecrement();

    // ✅ NEW: Apply Status Damage FIRST before enemy counter-attack
    applyStatusDamagePerTurnRef.current?.();
    
    // ❌ NUR STUN blockiert die Attacke!
    if (enemyStatus.type === "stun" && enemyStatus.duration > 0) {
      // Enemy ist stunned - kann nicht attacken
      newCombatLog.push(`😵 ${enemy.name} is stunned and cannot attack!`);
      setCombatLog(newCombatLog);
      return;
    }

    // ✅ NEW: Prüfe Stealth Buff (blockiert ALLE Angriffe)
    const stealthBuff = playerBuffs.active.find(b => b.type === "stealth");
    if (stealthBuff && stealthBuff.duration > 0) {
      newCombatLog.push(`🌀 ${enemy.name}'s attack missed! (You are in stealth)`);
      setCombatLog(newCombatLog);
      return;
    }

    const dodged = Math.random() < stats.dodgeChance;
    if (dodged) {
      newCombatLog.push(`🌀 You dodged ${enemy.name}'s attack!`);
      setCombatLog(newCombatLog);
      return;
    }

    let enemyDmg = calcEnemyDamage(enemy.atk, stats.defense);
    
    // ✅ NEW: Defense Buff (reduziert zusätzlichen Schaden)
    const defenseBuff = playerBuffs.active.find(b => b.type === "defense");
    let buffedDefense = stats.defense;
    if (defenseBuff && defenseBuff.duration > 0) {
      const defenseBonus = Math.floor(stats.defense * 0.5);
      buffedDefense = stats.defense + defenseBonus;
      enemyDmg = calcEnemyDamage(enemy.atk, buffedDefense);
      const blockedDmg = calcEnemyDamage(enemy.atk, stats.defense) - enemyDmg;
      newCombatLog.push(`🛡️ Defense Buff blocks ${blockedDmg} damage! Reduced to ${enemyDmg}`);
    }
    
    // ❄️ SLOW: 50% weniger Schaden wenn Enemy von Slow betroffen
    if (enemyStatus.type === "slow") {
      enemyDmg = Math.floor(enemyDmg * 0.5);
      newCombatLog.push(`❄️ ${enemy.name}'s attack is slowed! Reduced damage: ${enemyDmg}`);
    }
    
    const newHp = hp - enemyDmg;
    newCombatLog.push(`${enemy.name} deals ${enemyDmg} damage to you!`);

    if (newHp <= 0) {
      const goldLost = Math.floor(gold * 0.8);
      const itemsLost = inventory.length;
      newCombatLog.push("💀 You have been defeated!");
      newCombatLog.push(`Lost ${goldLost} gold and ${itemsLost} item${itemsLost !== 1 ? "s" : ""}!`);
      addLog(`💀 Defeated by ${enemy.name}! Lost ${goldLost}g and ${itemsLost} items.`);
      setCombatLog(newCombatLog);
      setHp(stats.maxHp);
      setGold(prev => prev - Math.floor(prev * 0.8));
      setInventory([]);
      
      // ✅ NEW: Entferne Status/Buffs beim Defeat
      setPlayerStatus({ type: null, duration: 0, damagePerTurn: 0 });
      setEnemyStatus({ type: null, duration: 0, damagePerTurn: 0 });
      setPlayerBuffs({ active: [] });
      setEnemyBuffs({ active: [] });
      
      const respawnCity = lastCity ? lastCity.name : null;
      setDeathPopup({
        enemyName: enemy.name,
        story: getDeathStory(enemy.name, playerName),
        goldLost, itemsLost, respawnCity,
        onContinue: () => {
          setDeathPopup(null);
          if (lastCity) {
            setPos({ x: lastCity.x, y: lastCity.y });
            setCurrentCity(lastCity);
            setScreen("city");
          } else {
            setPos({ x: startX, y: startY });
            const spawnCityKey = `${startX},${startY}`;
            if (cities[spawnCityKey]) {
              setCurrentCity(cities[spawnCityKey]);
              setLastCity(cities[spawnCityKey]);
              setVisitedCities(prev => new Set([...prev, cities[spawnCityKey].name]));  // ✅ Mark as visited
              setScreen("city");
            } else {
              setScreen("world");
            }
          }
          setEnemy(null);
        },
      });
      return;
    }

    setHp(newHp);
    setCombatLog(newCombatLog);
  }, [enemy, enemyHp, stats, hp, combatLog, difficulty, rollLoot, addLog, addFloatingDamage, lastCity, startX, startY, gold, inventory, handlePlayerStatusCheck, handleEnemyStatusCheck, enemyStatus, playerStatus, playerBuffs, handlePlayerBuffDecrement, handleEnemyBuffDecrement]);

  const flee = useCallback(() => {
    // ✅ NEW: Buff Decrement am Anfang der Aktion
    handlePlayerBuffDecrement();
    
    // SPIELER-ZYKLUS: Prüfe Spieler-Status
    if (handlePlayerStatusCheck()) {
      // Spieler hat Status - kann agieren aber Status wird angewendet
    }
    
    // ✅ NEW: 100% Flucht-Erfolg bei vollen HP, sonst 50%
    const fleeChance = hp === stats.maxHp ? 1.0 : 0.5;
    
    if (Math.random() < fleeChance) {
      addLog(hp === stats.maxHp ? "🏃 You fled from battle with ease! (Full HP)" : "🏃 You fled from battle!");
      
      // ✅ CRITICAL FIX: Clear all status/buffs when fleeing
      setPlayerStatus({ type: null, duration: 0, damagePerTurn: 0 });
      setEnemyStatus({ type: null, duration: 0, damagePerTurn: 0 });
      setPlayerBuffs({ active: [] });
      setEnemyBuffs({ active: [] });
      
      setCombatItemsOpen(false);
      setScreen("world");
      setEnemy(null);
    } else {
      // ✅ NEW: Apply Status Damage FIRST before enemy counter-attack
      applyStatusDamagePerTurnRef.current?.();
      
      const dodged = Math.random() < stats.dodgeChance;
      if (dodged) {
        setCombatLog(prev => [...prev, `Failed to flee! But you dodged ${enemy.name}'s attack! 🌀`]);
      } else {
        const enemyDmg = calcEnemyDamage(enemy.atk, stats.defense);
        setHp(prev => Math.max(1, prev - enemyDmg));
        setCombatLog(prev => [...prev, `Failed to flee! ${enemy.name} hits you for ${enemyDmg}!`]);
      }
    }
  }, [enemy, stats, addLog, enemyStatus, playerStatus, handlePlayerStatusCheck, handlePlayerBuffDecrement, hp]);


  const useItemInCombat = useCallback((item, idx) => {
    if (!enemy || enemyHp <= 0) return;
    if (item.type !== "consumable") return;

    // ✅ NEW: Buff Decrement am Anfang der Aktion
    handlePlayerBuffDecrement();

    // SPIELER-ZYKLUS: Prüfe Spieler-Status
    if (handlePlayerStatusCheck()) {
      // Spieler hat Status - kann agieren aber Status wird angewendet
    }

    // Use the item (heal)
    // ✅ NEW: Nutze healPercent wenn definiert, sonst value
    const healAmount = item.healPercent 
      ? Math.ceil(stats.maxHp * item.healPercent)
      : (item.value || 0);
    
    setHp(prev => Math.min(prev + healAmount, stats.maxHp));
    setInventory(prev => prev.filter((_, i) => i !== idx));
    setCombatLog(prev => [...prev, `🧪 Used ${item.name}, healed ${healAmount} HP!`]);

    // ✅ VISUAL: Floating Heal Text IM GRÜNEN KREIS (Player, oben links)
    const playerX = 150;  // Grünen Kreis Mitte X
    const playerY = 130;  // Grünen Kreis Mitte Y
    addFloatingDamage(`+${healAmount}`, playerX, playerY, false, true);

    // ✅ NEW: Apply Status Damage FIRST before enemy counter-attack
    applyStatusDamagePerTurnRef.current?.();

    // Enemy counterattack (can be dodged)
    const dodged = Math.random() < stats.dodgeChance;
    if (dodged) {
      setTimeout(() => {
        setCombatLog(prev => [...prev, `🌀 You dodged ${enemy.name}'s attack!`]);
      }, 300);
      setCombatItemsOpen(false);
      return;
    }
    const enemyDmg = calcEnemyDamage(enemy.atk, stats.defense);
    setTimeout(() => {
      setHp(prev => {
        const newHp = prev - enemyDmg;
        if (newHp <= 0) {
          // ✅ NEW: Entferne Status/Buffs beim Defeat
          setPlayerStatus({ type: null, duration: 0, damagePerTurn: 0 });
          setEnemyStatus({ type: null, duration: 0, damagePerTurn: 0 });
          setPlayerBuffs({ active: [] });
          setEnemyBuffs({ active: [] });
          
          const goldLost = Math.floor(gold * 0.8);
          const itemsLost = inventory.length - 1; // -1 because we just used one
          setCombatLog(cl => [...cl, `${enemy.name} deals ${enemyDmg} damage!`, `💀 You have been defeated! Lost ${goldLost}g and ${itemsLost} items!`]);
          addLog(`💀 Defeated by ${enemy.name}! Lost ${goldLost}g and ${itemsLost} items.`);
          setGold(g => g - Math.floor(g * 0.8));
          setInventory([]);
          setCombatItemsOpen(false);
          const respawnCity = lastCity ? lastCity.name : null;
          setDeathPopup({
            enemyName: enemy.name,
            story: getDeathStory(enemy.name, playerName),
            goldLost, itemsLost, respawnCity,
            onContinue: () => {
              setDeathPopup(null);
              if (lastCity) {
                setPos({ x: lastCity.x, y: lastCity.y });
                setCurrentCity(lastCity);
                setScreen("city");
              } else {
                setPos({ x: startX, y: startY });
                const spawnCityKey = `${startX},${startY}`;
                if (cities[spawnCityKey]) {
                  setCurrentCity(cities[spawnCityKey]);
                  setLastCity(cities[spawnCityKey]);
                  setVisitedCities(prev => new Set([...prev, cities[spawnCityKey].name]));  // ✅ Mark as visited
                  setScreen("city");
                } else {
                  setScreen("world");
                }
              }
              setEnemy(null);
            },
          });
          return stats.maxHp;
        }
        setCombatLog(cl => [...cl, `${enemy.name} deals ${enemyDmg} damage to you!`]);
        return newHp;
      });
    }, 300);

    setCombatItemsOpen(false);
  }, [enemy, enemyHp, stats, gold, inventory, addLog, lastCity, startX, startY, playerStatus, enemyStatus, handlePlayerStatusCheck, handlePlayerBuffDecrement]);

  const getCityQuests = useCallback((cityName, _unusedDiff) => {
    const cityKey = Object.keys(cities).find(k => cities[k].name === cityName);
    const city = cityKey ? cities[cityKey] : null;
    const chunkX = city ? Math.floor(city.x / CHUNK_SIZE) : undefined;
    const chunkY = city ? Math.floor(city.y / CHUNK_SIZE) : undefined;
    const bossQuestId = `chunk_boss_${chunkX}_${chunkY}`;
    const bossAccepted = !!acceptedChunkBossQuests?.[`chunk_${chunkX}_${chunkY}`];
    const bossCompleted = completedQuestIds.has(bossQuestId);

    // Invalidate cache if boss quest status changed
    const cached = cityQuestsCache[cityName];
    const cachedHasBoss = cached?.some(q => q.questKind === "chunkBossHunt");
    const shouldHaveBoss = !bossAccepted && !bossCompleted;
    const cacheStale = cachedHasBoss !== shouldHaveBoss;

    if (!cached || cacheStale) {
      let cityItemLevel = city?.itemLevel;
      if (!cityItemLevel && city) {
        cityItemLevel = getDifficulty(city.x, city.y, level).itemLevel;
      }
      cityItemLevel = cityItemLevel || 1;

      const chunk = city ? getChunkTier(city.x, city.y) : null;
      const regionName = chunk?.name || "";

      const generated = generateQuestgiverQuests(cityItemLevel, cities, cityName, chunkX, chunkY, acceptedChunkBossQuests, false, worldSeed, regionName, completedQuestIds);
      setCityQuestsCache(prev => ({ ...prev, [cityName]: generated }));
      return generated;
    }
    return cached;
  }, [cityQuestsCache, cities, acceptedChunkBossQuests, completedQuestIds, level, worldSeed]);

  const getCityBulletin = useCallback((cityName, _unusedDiff) => {
    if (!cityBulletinCache[cityName]) {
      const cityKey = Object.keys(cities).find(k => cities[k].name === cityName);
      const city = cityKey ? cities[cityKey] : null;
      let cityItemLevel = city?.itemLevel;
      if (!cityItemLevel && city) {
        cityItemLevel = getDifficulty(city.x, city.y, level).itemLevel;
      }
      setCityBulletinCache(prev => ({ ...prev, [cityName]: generateBulletinQuests(cityItemLevel || 1, worldSeed) }));
    }
    return cityBulletinCache[cityName] || [];
  }, [cityBulletinCache, cities, level]);

  const buyItem = useCallback((item) => {
    if (gold < item.cost) { addLog("Not enough gold!"); return; }
    if (!canAddItem(inventory, item)) { addLog("Inventory full! (20/20 slots)"); return; }
    setGold(prev => prev - item.cost);
    setInventory(prev => [...prev, { ...item, id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` }]);
    addLog(`Bought ${item.name} for ${item.cost}g`);
  }, [gold, inventory, addLog]);

  const useItem = useCallback((item, idx) => {
    if (item.type === "consumable" && item.effect === "heal") {
      if (screen === "combat" && enemy) {
        useItemInCombat(item, idx);
        return;
      }
      
      // ✅ NEW: Nutze healPercent wenn definiert, sonst value
      const healAmount = item.healPercent 
        ? Math.ceil(stats.maxHp * item.healPercent)
        : item.value;
      
      setHp(prev => Math.min(prev + healAmount, stats.maxHp));
      setInventory(prev => prev.filter((_, i) => i !== idx));
      addLog(`Used ${item.name}, healed ${healAmount} HP`);
      
      // ✅ VISUAL: Floating Heal Text IM GRÜNEN KREIS (Player, oben links)
      const playerX = 150;  // Grünen Kreis Mitte X
      const playerY = 130;  // Grünen Kreis Mitte Y
      addFloatingDamage(`+${healAmount}`, playerX, playerY, false, true);
    } else if (item.type === "consumable" && item.effect === "repel") {
      if (screen === "combat") { addLog("Cannot use Stealth Potion in combat!"); return; }
      setRepelSteps(item.value);
      setInventory(prev => prev.filter((_, i) => i !== idx));
      addLog(`🧪 Used ${item.name} — no encounters for ${item.value} steps!`);
    }
  }, [stats.maxHp, addLog, screen, enemy, useItemInCombat]);

  const equipItem = useCallback((item, idx) => {
    if (item.type !== "armor") return;
    setEquipment(prev => {
      const old = prev[item.slot];
      if (old) setInventory(inv => [...inv, old]);
      return { ...prev, [item.slot]: item };
    });
    setInventory(prev => prev.filter((_, i) => i !== idx));
    addLog(`Equipped ${item.name}`);
  }, [addLog]);

  const unequipItem = useCallback((slot) => {
    setEquipment(prev => {
      if (prev[slot]) {
        setInventory(inv => [...inv, prev[slot]]);
        addLog(`Unequipped ${prev[slot].name}`);
      }
      return { ...prev, [slot]: null };
    });
  }, [addLog]);

  const sellItem = useCallback((idx) => {
    const item = inventory[idx];
    if (item.type === "questitem" || item.type === "deliveryitem") return;
    const sellValue = Math.max(1, Math.floor((item.cost || 10) * 0.1));
    setGold(prev => prev + sellValue);
    setInventory(prev => prev.filter((_, i) => i !== idx));
    addLog(`Sold ${item.name} for ${sellValue}g`);
  }, [inventory, addLog]);

  const discardItem = useCallback((idx) => {
    const item = inventory[idx];
    setInventory(prev => prev.filter((_, i) => i !== idx));
    addLog(`🗑️ Discarded ${item.name}`);
  }, [inventory, addLog]);

  const acceptQuest = useCallback((quest, cityName, cityX, cityY) => {
    if (quest.accepted) return;
    setQuests(prev => [...prev, { ...quest, accepted: true, originCity: cityName, originX: cityX, originY: cityY }]);
    
    // ✅ ONLY mark as completed at TURN-IN time, not at ACCEPT!
    // (Except for bulletin/delivery quests which are instantaneous)
    if (quest.type === "questgiver" && quest.questKind !== "chunkBossHunt") {
      setCompletedQuestIds(prev => new Set([...prev, quest.id]));
    }
    
    // Mark chunk boss quest as accepted
    if (quest.questKind === "chunkBossHunt") {
      setAcceptedChunkBossQuests(prev => ({ ...prev, [`chunk_${quest.targetChunkX}_${quest.targetChunkY}`]: true }));
      addLog(`⚔️ Accepted quest: ${quest.title}`);
      return;
    }
    
    // Add delivery item to inventory for deliver quests
    if (quest.questKind === "deliver") {
      setInventory(prev => [...prev, {
        name: quest.deliverItem,
        type: "deliveryitem",
        id: `di_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        questId: quest.id,
      }]);
      addLog(`📜 Accepted quest: ${quest.title} (received ${quest.deliverItem})`);
    } else {
      addLog(`📜 Accepted quest: ${quest.title}`);
    }
  }, [addLog]);

  const turnInQuest = useCallback((questId) => {
    // ✅ Finde Quest entweder direkt oder by ähnliche Eigenschaften (für old IDs)
    let quest = quests.find(q => q.id === questId);
    
    // Falls nicht gefunden und questId ist alte Format (Date.now()), versuche fuzzy match
    if (!quest && questId.includes('qg_') && questId.includes('_')) {
      // Alt Format: qg_${Date.now()}_${random}
      // Kann nicht gemappt werden → Quest ist verloren
      addLog("❌ Quest no longer available (old session). Please accept new quests.");
      return;
    }
    
    if (!quest || !isQuestComplete(quest)) return;
    
    setGold(prev => prev + quest.goldReward);
    setXp(prev => prev + quest.xpReward);
    
    // ✅ NEW: Boss Hunt Quest - 70% chance für Boss Loot!
    if (quest.questKind === "chunkBossHunt" && Math.random() < 0.7) {
      const chunk = getChunkTier(quest.targetChunkX * 32, quest.targetChunkY * 32);  // ✅ Convert to world coords
      const chunkBiome = getBiome(quest.targetChunkX * 32, quest.targetChunkY * 32, worldSeed);
      if (chunk && chunk.levelRange) {
        // ✅ Roll boss loot like a real boss would drop!
        const bossLoot = generateBossLoot(chunk.levelRange, chunkBiome, questId.charCodeAt(0) * worldSeed + quest.targetChunkX * quest.targetChunkY);
        setInventory(prev => [...prev, bossLoot]);
        addLog(`🎁 Quest Reward: ${bossLoot.name} (${bossLoot.rarity})!`);
      }
    }
    
    // Remove quest items from inventory (only for gather quests)
    if (quest.questKind === "gather") {
      let toRemove = quest.targetCount;
      setInventory(prev => {
        const newInv = [];
        for (const item of prev) {
          if (item.name === quest.targetItem && toRemove > 0) { toRemove--; continue; }
          newInv.push(item);
        }
        return newInv;
      });
    }
    // Remove delivery item for deliver quests
    if (quest.questKind === "deliver") {
      setInventory(prev => prev.filter(i => !(i.type === "deliveryitem" && i.name === quest.deliverItem)));
    }
    
    setQuests(prev => prev.filter(q => q.id !== questId));
    // ✅ NOW mark as completed (after quest is fully processed)
    setCompletedQuestIds(prev => new Set([...prev, questId]));
    
    // ✅ Remove from accepted chunk boss quests
    if (quest.questKind === "chunkBossHunt") {
      setAcceptedChunkBossQuests(prev => {
        const updated = { ...prev };
        delete updated[`chunk_${quest.targetChunkX}_${quest.targetChunkY}`];
        return updated;
      });
      addLog(`✅ Quest complete: ${quest.title}! +${quest.goldReward}g, +${quest.xpReward} XP`);
      return;
    }
    
    addLog(`✅ Quest complete: ${quest.title}! +${quest.goldReward}g, +${quest.xpReward} XP`);
  }, [quests, isQuestComplete, worldSeed, addLog]);

  // Render map tiles
  const renderMap = () => {
    const tiles = [];
    const half = Math.floor(VIEW_SIZE / 2);
    for (let dy = -half; dy <= half; dy++) {
      for (let dx = -half; dx <= half; dx++) {
        const tx = pos.x + dx, ty = pos.y + dy;
        const isPlayer = dx === 0 && dy === 0;
        const isValid = tx >= 0 && ty >= 0 && tx < WORLD_SIZE && ty < WORLD_SIZE;
        const isAdjacent = Math.abs(dx) <= 1 && Math.abs(dy) <= 1 && !isPlayer;
        const cityKey = `${tx},${ty}`;
        const isCity = cities[cityKey];
        const isCave = caves[cityKey] && !defeatedBosses.has(cityKey);
        const isDefeatedCave = caves[cityKey] && defeatedBosses.has(cityKey);
        const tileBiome = isValid ? getBiome(tx, ty, worldSeed) : "void";
        const tileDiff = isValid ? getDifficulty(tx, ty) : null;

        tiles.push(
          <div
            key={`${dx},${dy}`}
            onClick={() => isAdjacent && isValid && move(dx, dy)}
            style={{
              width: TILE_PX, height: TILE_PX,
              background: isValid ? (isCity ? "#d4af3744" : isCave ? "#ef444444" : BIOME_COLORS[tileBiome] + "88") : "#000",
              border: isPlayer ? "2px solid #d4af37" : isAdjacent ? "1px solid #d4af3744" : "1px solid #0a0e27",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: isPlayer || isCave ? 18 : 13,
              cursor: isAdjacent && isValid ? "pointer" : "default",
              borderRadius: 2,
              position: "relative",
              transition: "background 0.15s",
              overflow: "visible",
              zIndex: isPlayer ? 10 : isCity ? 5 : isCave ? 5 : 1,
            }}
            title={isValid ? `${isCity ? `🏰 ${cities[cityKey].name}\n` : ""}${isCave ? `🕳️ ${caves[cityKey].bossName} — Lv.${caves[cityKey].itemLevel}\n` : ""}${tileBiome} (${tileDiff?.name})` : ""}
          >
            {isPlayer ? (
              <svg width={TILE_PX * 1.25} height={TILE_PX * 1.25} viewBox="0 0 90 110" fill="none" style={{overflow:"visible"}}>
                {/* Cape */}
                <path d="M38,55 Q22,72 24,105 L38,105 L38,52Z" fill="#8b0000" stroke="#6b0000" strokeWidth="0.8"/>
                {/* Legs */}
                <rect x="34" y="82" width="10" height="18" rx="2" fill="#2a2a3e" stroke="#5a5a8a" strokeWidth="1"/>
                <rect x="46" y="82" width="10" height="18" rx="2" fill="#2a2a3e" stroke="#5a5a8a" strokeWidth="1"/>
                {/* Boots */}
                <rect x="32" y="94" width="13" height="8" rx="2" fill="#1a1a2e" stroke="#5a5a8a" strokeWidth="1"/>
                <rect x="45" y="94" width="13" height="8" rx="2" fill="#1a1a2e" stroke="#5a5a8a" strokeWidth="1"/>
                {/* Chest */}
                <rect x="32" y="54" width="30" height="31" rx="3" fill="#2a2a3e" stroke="#5a5a8a" strokeWidth="1.2"/>
                <line x1="47" y1="58" x2="47" y2="82" stroke="#d4af37" strokeWidth="1"/>
                <line x1="36" y1="68" x2="58" y2="68" stroke="#d4af37" strokeWidth="1"/>
                {/* Shoulders */}
                <ellipse cx="30" cy="57" rx="7" ry="5" fill="#3a3a5a" stroke="#6a6a9a" strokeWidth="1"/>
                <ellipse cx="64" cy="57" rx="7" ry="5" fill="#3a3a5a" stroke="#6a6a9a" strokeWidth="1"/>
                {/* Arms */}
                <rect x="22" y="58" width="10" height="20" rx="2" fill="#2a2a3e" stroke="#5a5a8a" strokeWidth="1"/>
                <rect x="62" y="58" width="10" height="20" rx="2" fill="#2a2a3e" stroke="#5a5a8a" strokeWidth="1"/>
                {/* Sword */}
                <line x1="69" y1="62" x2="86" y2="28" stroke="#b0b8c8" strokeWidth="2.5" strokeLinecap="round"/>
                <line x1="64" y1="67" x2="75" y2="57" stroke="#d4af37" strokeWidth="3" strokeLinecap="round"/>
                {/* Helmet */}
                <path d="M33,54 Q33,28 47,25 Q61,28 61,54Z" fill="#2a2a3e" stroke="#5a5a8a" strokeWidth="1.2"/>
                <rect x="37" y="40" width="20" height="4" rx="2" fill="#0a0a14"/>
                <path d="M47,25 Q51,12 57,6" fill="none" stroke="#8b0000" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M33,54 Q33,28 47,25 Q61,28 61,54" fill="none" stroke="#d4af37" strokeWidth="0.8"/>
              </svg>
            ) : isCity ? (
              <svg width={TILE_PX * 1.5625} height={TILE_PX * 1.5625} viewBox="0 0 170 230" fill="none" style={{overflow:"visible", position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)"}}>
                {/* Base wall */}
                <rect x="20" y="110" width="130" height="115" fill="#1a1a2e" stroke="#5a5a8a" strokeWidth="1.2"/>
                <line x1="20" y1="130" x2="150" y2="130" stroke="#2a2a4a" strokeWidth="0.8"/>
                <line x1="20" y1="152" x2="150" y2="152" stroke="#2a2a4a" strokeWidth="0.8"/>
                <line x1="20" y1="174" x2="150" y2="174" stroke="#2a2a4a" strokeWidth="0.8"/>
                {/* Left tower */}
                <rect x="10" y="85" width="38" height="140" fill="#1a1a2e" stroke="#5a5a8a" strokeWidth="1.2"/>
                <rect x="10" y="72" width="10" height="16" fill="#1a1a2e" stroke="#5a5a8a" strokeWidth="1"/>
                <rect x="24" y="72" width="10" height="16" fill="#1a1a2e" stroke="#5a5a8a" strokeWidth="1"/>
                <rect x="14" y="105" width="10" height="14" rx="5" fill="#0a0a14" stroke="#3a3a5a" strokeWidth="0.8"/>
                <rect x="15" y="106" width="8" height="12" rx="4" fill="#d4af37" opacity="0.6"/>
                {/* Right tower */}
                <rect x="122" y="85" width="38" height="140" fill="#1a1a2e" stroke="#5a5a8a" strokeWidth="1.2"/>
                <rect x="126" y="72" width="10" height="16" fill="#1a1a2e" stroke="#5a5a8a" strokeWidth="1"/>
                <rect x="140" y="72" width="10" height="16" fill="#1a1a2e" stroke="#5a5a8a" strokeWidth="1"/>
                <rect x="146" y="105" width="10" height="14" rx="5" fill="#0a0a14" stroke="#3a3a5a" strokeWidth="0.8"/>
                {/* Center tower */}
                <rect x="58" y="55" width="54" height="170" fill="#1a1a2e" stroke="#5a5a8a" strokeWidth="1.2"/>
                <rect x="58" y="40" width="12" height="18" fill="#1a1a2e" stroke="#5a5a8a" strokeWidth="1"/>
                <rect x="76" y="40" width="12" height="18" fill="#1a1a2e" stroke="#5a5a8a" strokeWidth="1"/>
                <rect x="94" y="40" width="12" height="18" fill="#1a1a2e" stroke="#5a5a8a" strokeWidth="1"/>
                <rect x="73" y="78" width="24" height="28" rx="12" fill="#0a0a14" stroke="#3a3a5a" strokeWidth="0.8"/>
                <rect x="74" y="79" width="22" height="26" rx="11" fill="#d4af37" opacity="0.6"/>
                <rect x="73" y="118" width="24" height="28" rx="12" fill="#0a0a14" stroke="#3a3a5a" strokeWidth="0.8"/>
                {/* Gate */}
                <rect x="73" y="168" width="24" height="57" fill="#080810"/>
                <path d="M73,188 Q73,168 85,168 Q97,168 97,188" fill="#080810" stroke="#3a3a5a" strokeWidth="0.8"/>
                <line x1="79" y1="170" x2="79" y2="225" stroke="#2a2a3a" strokeWidth="1"/>
                <line x1="85" y1="170" x2="85" y2="225" stroke="#2a2a3a" strokeWidth="1"/>
                <line x1="91" y1="170" x2="91" y2="225" stroke="#2a2a3a" strokeWidth="1"/>
                <line x1="73" y1="190" x2="97" y2="190" stroke="#2a2a3a" strokeWidth="1"/>
                <line x1="73" y1="208" x2="97" y2="208" stroke="#2a2a3a" strokeWidth="1"/>
                {/* Flag */}
                <line x1="85" y1="5" x2="85" y2="42" stroke="#4a4a6a" strokeWidth="1.2"/>
                <polygon points="85,5 85,22 100,13" fill="#8b1a1a"/>
              </svg>
            ) : isCave ? (
              <svg width={TILE_PX * 1.5625} height={TILE_PX * 1.5625} viewBox="0 0 100 100" fill="none" style={{overflow:"visible", position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)"}}>
                {/* Rock mass layers */}
                <ellipse cx="50" cy="72" rx="48" ry="28" fill="#1a1a2e" stroke="#4a4a6a" strokeWidth="1.2"/>
                <ellipse cx="50" cy="65" rx="46" ry="34" fill="#1a1a2e" stroke="#4a4a6a" strokeWidth="1"/>
                <ellipse cx="38" cy="55" rx="30" ry="26" fill="#1a1a2e" stroke="#4a4a6a" strokeWidth="0.8"/>
                <ellipse cx="62" cy="52" rx="28" ry="24" fill="#1a1a2e" stroke="#4a4a6a" strokeWidth="0.8"/>
                {/* Cave opening */}
                <ellipse cx="50" cy="76" rx="22" ry="16" fill="#080810"/>
                <path d="M28,76 Q28,56 50,53 Q72,56 72,76" fill="#080810"/>
                <ellipse cx="50" cy="78" rx="18" ry="12" fill="#030308"/>
                {/* Stalactites */}
                <polygon points="36,56 39,70 42,56" fill="#141428"/>
                <polygon points="46,53 49,68 52,53" fill="#141428"/>
                <polygon points="56,54 59,69 62,54" fill="#141428"/>
                {/* Eerie glow */}
                <ellipse cx="50" cy="80" rx="12" ry="6" fill="#8b0000" opacity="0.3"/>
                {/* Rock texture */}
                <line x1="10" y1="68" x2="20" y2="60" stroke="#2a2a4a" strokeWidth="0.8"/>
                <line x1="76" y1="62" x2="88" y2="70" stroke="#2a2a4a" strokeWidth="0.8"/>
              </svg>
            ) : isDefeatedCave ? (
              <svg width={TILE_PX * 1.25} height={TILE_PX * 1.25} viewBox="0 0 80 100" fill="none" style={{overflow:"visible"}}>
                {/* Skull dome */}
                <ellipse cx="40" cy="42" rx="28" ry="26" fill="#c8c0a0" stroke="#a09080" strokeWidth="1"/>
                {/* Jaw */}
                <rect x="20" y="56" width="40" height="18" rx="3" fill="#c8c0a0" stroke="#a09080" strokeWidth="1"/>
                {/* Teeth */}
                <rect x="23" y="67" width="6" height="9" rx="1" fill="#0d0d1a"/>
                <rect x="32" y="67" width="6" height="9" rx="1" fill="#0d0d1a"/>
                <rect x="41" y="67" width="6" height="9" rx="1" fill="#0d0d1a"/>
                <rect x="50" y="67" width="6" height="9" rx="1" fill="#0d0d1a"/>
                {/* Eye sockets */}
                <ellipse cx="30" cy="42" rx="9" ry="10" fill="#0d0d1a"/>
                <ellipse cx="50" cy="42" rx="9" ry="10" fill="#0d0d1a"/>
                {/* Nose */}
                <path d="M36,56 L40,50 L44,56 Z" fill="#0d0d1a"/>
                {/* Jaw line */}
                <line x1="20" y1="65" x2="60" y2="65" stroke="#a09080" strokeWidth="0.8"/>
                {/* Crack */}
                <path d="M40,17 L37,28 L42,36 L38,46" fill="none" stroke="#a09080" strokeWidth="1.2"/>
              </svg>
            ) : ""}
          </div>
        );
      }
    }
    return tiles;
  };

  // Floating UI overlays (quest log, map, character, inventory)
  const questLogOverlay = (
    <>
      {/* ── Bottom navigation bar ── */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 1000,
        display: "flex", gap: 8, padding: "8px 12px",
        background: "rgba(10,14,39,0.92)", borderTop: "1px solid #d4af3733",
        backdropFilter: "blur(6px)",
      }}>
        <button
          onClick={() => setInventoryOpen(prev => !prev)}
          style={{
            ...S.btn, flex: 1, padding: "8px 6px", fontSize: 17, position: "relative",
            boxShadow: "0 2px 12px #000a",
            background: inventoryOpen ? "linear-gradient(180deg, #1a200e, #101508)" : "linear-gradient(180deg, #2a1f0e, #1a140a)",
            borderColor: inventoryOpen ? "#f59e0b" : "#d4af37",
            color: inventoryOpen ? "#f59e0b" : "#d4af37",
          }}
        >
          🎒 Bag
          {inventory.length > 0 && (
            <span style={{
              position: "absolute", top: -6, right: -6,
              background: "#d4af37", color: "#0a0e27", borderRadius: "50%",
              minWidth: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700, padding: "0 4px",
            }}>{inventory.length}</span>
          )}
        </button>
        <button
          onClick={() => setCharWindowOpen(prev => !prev)}
          style={{
            ...S.btn, flex: 1, padding: "8px 6px", fontSize: 17, position: "relative",
            boxShadow: "0 2px 12px #000a",
            background: charWindowOpen ? "linear-gradient(180deg, #2a1a0e, #1a1008)" : "linear-gradient(180deg, #2a1f0e, #1a140a)",
            borderColor: charWindowOpen ? "#f59e0b" : "#d4af37",
            color: charWindowOpen ? "#f59e0b" : "#d4af37",
          }}
        >
          ⚔️ Character
          {statPoints > 0 && (
            <span style={{
              position: "absolute", top: -6, right: -6,
              background: "#4ade80", color: "#0a0e27", borderRadius: "50%",
              width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700,
            }}>{statPoints}</span>
          )}
        </button>
        <button
          onClick={() => setWorldMapOpen(prev => !prev)}
          style={{
            ...S.btn, flex: 1, padding: "8px 6px", fontSize: 17,
            boxShadow: "0 2px 12px #000a",
            background: worldMapOpen ? "linear-gradient(180deg, #0e1a2a, #081018)" : "linear-gradient(180deg, #2a1f0e, #1a140a)",
            borderColor: worldMapOpen ? "#60a5fa" : "#d4af37",
            color: worldMapOpen ? "#60a5fa" : "#d4af37",
          }}
        >
          🗺️ Map
        </button>
        <button
          onClick={() => setQuestLogOpen(prev => !prev)}
          style={{
            ...S.btn, flex: 1, padding: "8px 6px", fontSize: 17,
            boxShadow: "0 2px 12px #000a",
            background: questLogOpen ? "linear-gradient(180deg, #1a2a0e, #0f1a08)" : "linear-gradient(180deg, #2a1f0e, #1a140a)",
            borderColor: questLogOpen ? "#4ade80" : "#d4af37",
            color: questLogOpen ? "#4ade80" : "#d4af37",
          }}
        >
          📜 Quests {activeQuests.length > 0 ? `(${activeQuests.length})` : ""}
        </button>
        <SkillsButton learnedAbilities={learnedAbilities} abilityChoicePopup={abilityChoicePopup} skillsOpen={skillsOpen} setSkillsOpen={setSkillsOpen} />
      </div>
      {questLogOpen && (
        <div style={{
          position: "fixed", bottom: 60, right: 8, zIndex: 999,
          width: 380, maxHeight: "60vh", overflowY: "auto",
          background: "rgba(10,14,39,0.97)", border: "1px solid #d4af3766",
          borderRadius: 10, padding: 14, boxShadow: "0 4px 24px #000c",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h3 style={{ ...S.gold, margin: 0, fontSize: 21, display:"flex", alignItems:"center", gap:8 }}><ScrollSVG size={28}/> Quest Log</h3>
            <button onClick={() => setQuestLogOpen(false)} style={{ background: "none", border: "none", color: "#e8d7c3", cursor: "pointer", fontSize: 21, padding: 0 }}>✕</button>
          </div>
          {activeQuests.length === 0 && (
            <div style={{ opacity: 0.5, fontSize: 17, textAlign: "center", padding: 16 }}>No active quests.</div>
          )}
          {activeQuests.map(q => {
            const progress = getQuestProgress(q);
            const target = q.questKind === "chunkBossHunt" ? q.targetBosses : q.targetCount;
            const complete = progress >= target;
            const icon = q.questKind === "kill" ? <KillSVG size={18}/> : q.questKind === "deliver" ? <DeliverSVG size={18}/> : q.questKind === "chunkBossHunt" ? <WeaponSVG size={18}/> : <GatherSVG size={18}/>;
            const pct = (progress / target) * 100;
            return (
              <div key={q.id} style={{ marginBottom: 10, padding: 8, background: complete ? "#4ade8009" : "#ffffff05", borderRadius: 6, border: `1px solid ${complete ? "#4ade8033" : "#d4af3722"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                  <span style={{ fontWeight: 600, fontSize: 17 }}>{icon} {q.title}</span>
                  <span style={S.badge(q.type === "questgiver" ? "#d4af37" : "#60a5fa")}>{q.type === "questgiver" ? "Questgiver" : "Bulletin"}</span>
                </div>
                <div style={{ fontSize: 17, opacity: 0.6, marginBottom: 4 }}>{q.description}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <div style={{ flex: 1, height: 8, background: "#1a1a2e", borderRadius: 4, overflow: "hidden", border: "1px solid #d4af3722" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: complete ? "#4ade80" : "#d4af37", transition: "width 0.3s", borderRadius: 3 }} />
                  </div>
                  <span style={{ fontSize: 17, fontWeight: 700, color: complete ? "#4ade80" : "#e8d7c3", minWidth: 36, textAlign: "right" }}>{progress}/{target}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 17, marginBottom: 6 }}>
                  <span style={{ opacity: 0.5 }}>📍 {q.questKind === "deliver" ? `→ ${q.targetCity} (${q.targetCityX}, ${q.targetCityY})` : `${q.originCity} (${q.originX}, ${q.originY})`}</span>
                  <span style={S.gold}><MerchantSVG size={16}/> {q.goldReward}g  ✨ {q.xpReward} XP</span>
                </div>
                {complete && <div style={{ fontSize: 17, color: "#4ade80", fontWeight: 600, marginBottom: 6 }}>✅ Ready to turn in at {q.questKind === "deliver" ? `${q.targetCity} (${q.targetCityX}, ${q.targetCityY})` : `${q.originCity} (${q.originX}, ${q.originY})`}</div>}
                {/* ✅ NEW: Abort Button */}
                <button 
                  onClick={() => setQuests(prev => prev.map(qu => qu.id === q.id ? { ...qu, accepted: false } : qu))}
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    fontSize: 15,
                    background: "rgba(239,68,68,0.15)",
                    border: "1px solid rgba(239,68,68,0.5)",
                    borderRadius: 4,
                    color: "#ef4444",
                    cursor: "pointer",
                    fontWeight: 600,
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => e.target.style.background = "rgba(239,68,68,0.25)"}
                  onMouseLeave={(e) => e.target.style.background = "rgba(239,68,68,0.15)"}
                >
                  ❌ Abort Quest
                </button>
              </div>
            );
          })}
        </div>
      )}
      {skillsOpen && <SkillsPanel
        learnedAbilities={learnedAbilities}
        onClose={() => setSkillsOpen(false)}
      />}
      {charWindowOpen && (
        <div style={{
          position: "fixed", bottom: 60, left: "calc(25% + 8px)", zIndex: 999,
          width: 420, maxHeight: "70vh", overflowY: "auto",
          background: "rgba(10,14,39,0.97)", border: "1px solid #d4af3766",
          borderRadius: 10, padding: 18, boxShadow: "0 4px 24px #000c",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ ...S.gold, margin: 0, fontSize: 24 }}>⚔️ {playerName}</h3>
            <button onClick={() => setCharWindowOpen(false)} style={{ background: "none", border: "none", color: "#e8d7c3", cursor: "pointer", fontSize: 22, padding: 0 }}>✕</button>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, fontSize: 17 }}>
            <span>Level <strong style={S.gold}>{level}</strong></span>
            <span>XP <strong style={S.gold}>{xp}/{xpToLevel}</strong></span>
            <span><MerchantSVG size={16}/> <strong style={S.gold}>{gold}</strong></span>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 14, opacity: 0.5, textTransform: "uppercase", letterSpacing: 1 }}>Attributes</div>
              {statPoints > 0 && (
                <span style={{ background: "#4ade8022", color: "#4ade80", border: "1px solid #4ade8055", borderRadius: 6, padding: "3px 10px", fontSize: 14, fontWeight: 700 }}>
                  ✨ {statPoints} point{statPoints > 1 ? "s" : ""} available
                </span>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {Object.entries(attrs).map(([key, val]) => (
                <StatRow key={key} statKey={key} val={val} statPoints={statPoints}
                  onAdd={() => {
                    setAttrs(prev => ({ ...prev, [key]: prev[key] + 1 }));
                    setStatPoints(prev => prev - 1);
                    addLog(`📈 +1 ${key.charAt(0).toUpperCase() + key.slice(1)}!`);
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, opacity: 0.5, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Derived Stats</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <div style={{ background: "#ef444411", padding: "10px 12px", borderRadius: 6, border: "1px solid #ef444422", textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#ef4444" }}>{hp}/{stats.maxHp}</div>
                <div style={{ fontSize: 14, opacity: 0.5 }}>HP</div>
              </div>
              <div style={{ background: "#4169E111", padding: "10px 12px", borderRadius: 6, border: "1px solid #4169E122", textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#4169E1" }}>{mana}/{stats.maxMana}</div>
                <div style={{ fontSize: 14, opacity: 0.5 }}>Mana</div>
              </div>
              <div style={{ background: "#d4af3711", padding: "10px 12px", borderRadius: 6, border: "1px solid #d4af3722", textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#d4af37" }}>{stats.damage}</div>
                <div style={{ fontSize: 14, opacity: 0.5 }}>Damage</div>
              </div>
              <div style={{ background: "#60a5fa11", padding: "10px 12px", borderRadius: 6, border: "1px solid #60a5fa22", textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#60a5fa" }}>{stats.defense}</div>
                <div style={{ fontSize: 14, opacity: 0.5 }}>Defense</div>
              </div>
              <div style={{ background: "#4ade8011", padding: "10px 12px", borderRadius: 6, border: "1px solid #4ade8022", textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#4ade80" }}>{Math.round(stats.dodgeChance * 100)}%</div>
                <div style={{ fontSize: 14, opacity: 0.5 }}>Dodge</div>
              </div>
              <div style={{ background: "#f59e0b11", padding: "10px 12px", borderRadius: 6, border: "1px solid #f59e0b22", textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#f59e0b" }}>{Math.round(stats.critChance * 100)}%</div>
                <div style={{ fontSize: 14, opacity: 0.5 }}>Crit</div>
              </div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 14, opacity: 0.5, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>Equipment</div>
            
            {/* Top: Head centered with divider line below */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid #ffffff22" }}>
              <EquipSlot slot="head" item={equipment.head} svgIcon={<HelmSVG size={64}/>} />
            </div>
            
            {/* Middle row: Weapon | Character | Shield */}
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 16 }}>
              <EquipSlot slot="weapon" item={equipment.weapon} svgIcon={<WeaponSVG size={64}/>} />
              <div style={{
                width: 105, height: 105, display: "flex", alignItems: "center", justifyContent: "center",
                background: "radial-gradient(circle, #d4af3711 0%, transparent 70%)",
                borderRadius: "50%", border: "2px solid #d4af3733",
              }}>
                <svg width="96" height="96" viewBox="0 0 90 110" fill="none" style={{overflow:"visible"}}>
                  <path d="M38,55 Q22,72 24,105 L38,105 L38,52Z" fill="#8b0000" stroke="#6b0000" strokeWidth="0.8"/>
                  <rect x="34" y="82" width="10" height="18" rx="2" fill="#2a2a3e" stroke="#5a5a8a" strokeWidth="1"/>
                  <rect x="46" y="82" width="10" height="18" rx="2" fill="#2a2a3e" stroke="#5a5a8a" strokeWidth="1"/>
                  <rect x="32" y="94" width="13" height="8" rx="2" fill="#1a1a2e" stroke="#5a5a8a" strokeWidth="1"/>
                  <rect x="45" y="94" width="13" height="8" rx="2" fill="#1a1a2e" stroke="#5a5a8a" strokeWidth="1"/>
                  <rect x="32" y="54" width="30" height="31" rx="3" fill="#2a2a3e" stroke="#5a5a8a" strokeWidth="1.2"/>
                  <line x1="47" y1="58" x2="47" y2="82" stroke="#d4af37" strokeWidth="1"/>
                  <line x1="36" y1="68" x2="58" y2="68" stroke="#d4af37" strokeWidth="1"/>
                  <ellipse cx="30" cy="57" rx="7" ry="5" fill="#3a3a5a" stroke="#6a6a9a" strokeWidth="1"/>
                  <ellipse cx="64" cy="57" rx="7" ry="5" fill="#3a3a5a" stroke="#6a6a9a" strokeWidth="1"/>
                  <rect x="22" y="58" width="10" height="20" rx="2" fill="#2a2a3e" stroke="#5a5a8a" strokeWidth="1"/>
                  <rect x="62" y="58" width="10" height="20" rx="2" fill="#2a2a3e" stroke="#5a5a8a" strokeWidth="1"/>
                  <line x1="69" y1="62" x2="86" y2="28" stroke="#b0b8c8" strokeWidth="2.5" strokeLinecap="round"/>
                  <line x1="64" y1="67" x2="75" y2="57" stroke="#d4af37" strokeWidth="3" strokeLinecap="round"/>
                  <path d="M33,54 Q33,28 47,25 Q61,28 61,54Z" fill="#2a2a3e" stroke="#5a5a8a" strokeWidth="1.2"/>
                  <rect x="37" y="40" width="20" height="4" rx="2" fill="#0a0a14"/>
                  <path d="M47,25 Q51,12 57,6" fill="none" stroke="#8b0000" strokeWidth="2.5" strokeLinecap="round"/>
                  <path d="M33,54 Q33,28 47,25 Q61,28 61,54" fill="none" stroke="#d4af37" strokeWidth="0.8"/>
                </svg>
              </div>
              <EquipSlot slot="shield" item={equipment.shield} svgIcon={<ShieldSVG size={64}/>} />
            </div>
            
            {/* Bottom: Chest centered with divider line above */}
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 16, borderTop: "1px solid #ffffff22" }}>
              <EquipSlot slot="chest" item={equipment.chest} svgIcon={<ChestSVG size={64}/>} />
            </div>
            
            {/* Stats row */}
            <div style={{ textAlign: "center", fontSize: 15, opacity: 0.6, marginTop: 12 }}>
              <span style={{ color: "#ef4444" }}>⚔️ {stats.damage}</span>
              {" "}
              <span style={{ color: "#60a5fa" }}>🛡️ {stats.defense}</span>
            </div>
          </div>

          {/* ✅ GEARSCORE - Addierte itemLevels der angelegten Ausrüstung */}
          <div style={{ marginTop: 20 }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 12px",
              backgroundColor: "#1a1a2e",
              borderRadius: 6,
              borderLeft: "3px solid #d4af37"
            }}>
              <span style={{ fontSize: 18 }}>💎</span>
              <div>
                <div style={{ fontSize: 12, opacity: 0.6, textTransform: "uppercase", letterSpacing: 0.5 }}>Gearscore</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#d4af37" }}>
                  <GearScore equipment={equipment} />
                </div>
              </div>
              <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.5 }}>
                {[equipment.weapon, equipment.chest, equipment.shield, equipment.head]
                  .filter(Boolean)
                  .length}/4 slots
              </div>
            </div>
          </div>
        </div>
      )}
      {inventoryOpen && <InventoryPanel stackedInventory={stackedInventory} inventory={inventory} currentCity={currentCity} useItem={useItem} equipItem={equipItem} sellItem={sellItem} discardItem={discardItem} setInventoryOpen={setInventoryOpen} getUniqueStacks={getUniqueStacks} />}
    </>
  );

  // Zoomable big map
  const MAP_ZOOM_LEVELS = [
    { radius: Math.floor(WORLD_SIZE / 2), px: Math.max(1, Math.floor(480 / WORLD_SIZE)), label: "Full" },
    { radius: Math.floor(WORLD_SIZE / 3), px: Math.max(1, Math.ceil(480 / (WORLD_SIZE * 2 / 3))), label: "Far" },
    { radius: 80, px: 3, label: "Mid" },
    { radius: 40, px: 6, label: "Close" },
  ];

  useEffect(() => {
    if (!worldMapOpen || !bigMapCanvasRef.current) return;
    const zoom = MAP_ZOOM_LEVELS[mapZoom] || MAP_ZOOM_LEVELS[2];
    const center = mapCenter || pos;
    const canvas = bigMapCanvasRef.current;
    const ctx = canvas.getContext("2d");
    const mapSize = zoom.radius * 2 + 1;
    const size = mapSize * zoom.px;
    canvas.width = size;
    canvas.height = size;

    const BIOME_HEX = {
      ocean: "#3a6a8a", coast: "#6aaa8a", river: "#4a8aaa", lake: "#3a7a9a", swamp: "#6a7a4a",
      desert: "#c4a060", savanna: "#b0a050", grassland: "#7aaa55",
      forest: "#3a6a30", jungle: "#2a5828",
      tundra: "#8a9898", mountain: "#8a6a5a",
      volcanic: "#8a3828", glacier: "#b0c8d8",
    };
    const step = zoom.px <= 1 ? 2 : 1;

    for (let dy = -zoom.radius; dy <= zoom.radius; dy += step) {
      for (let dx = -zoom.radius; dx <= zoom.radius; dx += step) {
        const tx = center.x + dx, ty = center.y + dy;
        const px = (dx + zoom.radius) * zoom.px;
        const py = (dy + zoom.radius) * zoom.px;
        const drawPx = zoom.px * step;

        if (tx < 0 || ty < 0 || tx >= WORLD_SIZE || ty >= WORLD_SIZE) {
          ctx.fillStyle = "#111";
          ctx.fillRect(px, py, drawPx, drawPx);
          continue;
        }

        const b = getBiome(tx, ty, worldSeed);
        ctx.fillStyle = BIOME_HEX[b] || "#333";
        ctx.fillRect(px, py, drawPx, drawPx);

        const ck = `${tx},${ty}`;
        if (cities[ck]) {
          const hasTurnIn = quests.some(q => q.accepted && q.originCity === cities[ck].name && isQuestComplete(q));
          const isVisited = visitedCities.has(cities[ck].name);
          const isDeliveryTarget = quests.some(q => q.accepted && q.questKind === "deliver" && q.targetCityX === tx && q.targetCityY === ty);
          ctx.fillStyle = hasTurnIn ? "#4ade80" : (isDeliveryTarget ? "#ff88ff" : (isVisited ? "#0088ff" : "#d4af37"));
          const ms = Math.max(2, zoom.px);
          ctx.fillRect(px, py, ms, ms);
          // Draw ring around delivery target cities
          if (isDeliveryTarget) {
            ctx.strokeStyle = "#ff88ff";
            ctx.lineWidth = 1;
            const ring = Math.max(3, ms + 2);
            ctx.strokeRect(px - 1, py - 1, ring, ring);
          }
        }

        if (caves[ck]) {
          const defeated = defeatedBosses.has(ck);
          // Color cave dot by its itemLevel tier
          const caveTier = getDifficultyTier(caves[ck].itemLevel || 1);
          ctx.fillStyle = defeated ? "#666" : (TIER_COLORS[caveTier] || "#ef4444");
          const ms = Math.max(2, zoom.px);
          ctx.fillRect(px, py, ms, ms);
          ctx.fillStyle = defeated ? "#333" : "#000";
          const inset = Math.max(1, Math.floor(ms / 4));
          ctx.fillRect(px + inset, py + inset, Math.max(1, ms - inset * 2), Math.max(1, ms - inset * 2));
        }
      }
    }

    // Draw chunk tier boundaries (thin lines) and labels based on CHUNK_TIERS
    // Only draw lines where biome is NOT ocean
    ctx.strokeStyle = "#ffffff44";  // Semi-transparent white
    ctx.lineWidth = 1;
    
    // Helper function to check if a position is in ocean
    const isOceanBiome = (x, y) => getBiome(x, y, worldSeed) === "ocean";
    
    // Draw boundaries based on actual chunks - only where not ocean
    const drawnBoundaries = new Set();
    
    // Draw vertical boundaries
    const verticalBounds = new Set();
    for (const chunk of CHUNK_TIERS) {
      verticalBounds.add(chunk.xMin);
      verticalBounds.add(chunk.xMax);
    }
    
    for (const xBound of verticalBounds) {
      const dx = xBound - center.x;
      if (Math.abs(dx) <= zoom.radius) {
        const px = (dx + zoom.radius) * zoom.px;
        
        // Draw line in segments, only where not ocean
        let inLine = false;
        let lineStartPy = null;
        
        for (let y = 0; y <= WORLD_SIZE; y += 5) {
          const isOcean = isOceanBiome(xBound, y);
          
          if (!isOcean && !inLine) {
            // Start of non-ocean segment
            const dy = y - center.y;
            if (Math.abs(dy) <= zoom.radius) {
              lineStartPy = (dy + zoom.radius) * zoom.px;
              inLine = true;
            }
          } else if (isOcean && inLine) {
            // End of non-ocean segment - draw line
            const dy = y - center.y;
            if (Math.abs(dy) <= zoom.radius) {
              const lineEndPy = (dy + zoom.radius) * zoom.px;
              ctx.beginPath();
              ctx.moveTo(px, lineStartPy);
              ctx.lineTo(px, lineEndPy);
              ctx.stroke();
              inLine = false;
            }
          }
        }
        
        // Draw remaining line if still active
        if (inLine) {
          const lineEndPy = ((WORLD_SIZE - center.y) + zoom.radius) * zoom.px;
          ctx.beginPath();
          ctx.moveTo(px, lineStartPy);
          ctx.lineTo(px, lineEndPy);
          ctx.stroke();
        }
      }
    }
    
    // Draw horizontal boundaries
    const horizontalBounds = new Set();
    for (const chunk of CHUNK_TIERS) {
      horizontalBounds.add(chunk.yMin);
      horizontalBounds.add(chunk.yMax);
    }
    
    for (const yBound of horizontalBounds) {
      const dy = yBound - center.y;
      if (Math.abs(dy) <= zoom.radius) {
        const py = (dy + zoom.radius) * zoom.px;
        
        // Draw line in segments, only where not ocean
        let inLine = false;
        let lineStartPx = null;
        
        for (let x = 0; x <= WORLD_SIZE; x += 5) {
          const isOcean = isOceanBiome(x, yBound);
          
          if (!isOcean && !inLine) {
            // Start of non-ocean segment
            const dx = x - center.x;
            if (Math.abs(dx) <= zoom.radius) {
              lineStartPx = (dx + zoom.radius) * zoom.px;
              inLine = true;
            }
          } else if (isOcean && inLine) {
            // End of non-ocean segment - draw line
            const dx = x - center.x;
            if (Math.abs(dx) <= zoom.radius) {
              const lineEndPx = (dx + zoom.radius) * zoom.px;
              ctx.beginPath();
              ctx.moveTo(lineStartPx, py);
              ctx.lineTo(lineEndPx, py);
              ctx.stroke();
              inLine = false;
            }
          }
        }
        
        // Draw remaining line if still active
        if (inLine) {
          const lineEndPx = ((WORLD_SIZE - center.x) + zoom.radius) * zoom.px;
          ctx.beginPath();
          ctx.moveTo(lineStartPx, py);
          ctx.lineTo(lineEndPx, py);
          ctx.stroke();
        }
      }
    }

    // Draw chunk level ranges BELOW each chunk center with WHITE TEXT
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";  // ✅ Text starts from top (not middle)
    
    for (const chunk of CHUNK_TIERS) {
      const chunkCenterX = (chunk.xMin + chunk.xMax) / 2;
      const chunkCenterY = (chunk.yMin + chunk.yMax) / 2;
      const dx = chunkCenterX - center.x;
      const dy = chunkCenterY - center.y;
      
      if (Math.abs(dx) <= zoom.radius && Math.abs(dy) <= zoom.radius) {
        const px = (dx + zoom.radius) * zoom.px;
        const py = (dy + zoom.radius) * zoom.px;
        
        // ✅ Draw text BELOW chunk center
        const textY = py + 20;
        const lineHeight = 14;
        
        // ✅ FIRST LINE: Region Name (centered)
        ctx.fillStyle = "#ffffff";
        ctx.fillText(chunk.name, px, textY);
        
        // ✅ SECOND LINE: Level Range (centered, below name)
        let levelText;
        if (chunk.isDynamic) {
          levelText = "(Dynamic)";
        } else {
          levelText = `Lv. ${chunk.levelRange[0]}-${chunk.levelRange[1]}`;
        }
        ctx.fillText(levelText, px, textY + lineHeight);
      }
    }

    // Player marker (offset from center based on player pos vs map center)
    const playerDx = pos.x - center.x;
    const playerDy = pos.y - center.y;
    if (Math.abs(playerDx) <= zoom.radius && Math.abs(playerDy) <= zoom.radius) {
      const pcx = (playerDx + zoom.radius) * zoom.px;
      const pcy = (playerDy + zoom.radius) * zoom.px;
      const pSize = Math.max(3, zoom.px + 2);
      ctx.fillStyle = "#ff3333";
      ctx.fillRect(pcx - 1, pcy - 1, pSize, pSize);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.strokeRect(pcx - 2, pcy - 2, pSize + 2, pSize + 2);
    }

  }, [worldMapOpen, mapZoom, mapCenter, pos, worldSeed, cities, caves, defeatedBosses, quests, isQuestComplete]);

  const worldMapOverlay = worldMapOpen && (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1100,
      background: "rgba(5,7,20,0.92)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    }} onClick={() => setWorldMapOpen(false)}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "rgba(15,20,45,0.98)", border: "1px solid #d4af3766", borderRadius: 12,
        padding: 16, boxShadow: "0 8px 32px #000c", maxWidth: "95vw", maxHeight: "90vh", overflow: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h3 style={{ ...S.gold, margin: 0, fontSize: 21, display:"flex", alignItems:"center", gap:8 }}>
            <CastleSVG size={28}/> World Map
            {fastTravelMode && <span style={{ fontSize: 13, color: "#60a5fa", fontWeight: 600, marginLeft: 8 }}>— Click a visited city to travel</span>}
          </h3>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button onClick={() => { setMapCenter(null); }} style={{ ...S.btn, padding: "4px 10px", fontSize: 14 }}>📍 Player</button>
            <button onClick={() => setMapZoom(z => Math.min(3, z + 1))} style={{ ...S.btn, padding: "4px 10px", fontSize: 18 }} disabled={mapZoom >= 3}>🔍+</button>
            <span style={{ fontSize: 13, opacity: 0.5, minWidth: 32, textAlign: "center" }}>{MAP_ZOOM_LEVELS[mapZoom]?.label}</span>
            <button onClick={() => setMapZoom(z => Math.max(0, z - 1))} style={{ ...S.btn, padding: "4px 10px", fontSize: 18 }} disabled={mapZoom <= 0}>🔍−</button>
            <button onClick={() => { setWorldMapOpen(false); setMapCenter(null); setFastTravelMode(false); }} style={{ background: "none", border: "none", color: "#e8d7c3", cursor: "pointer", fontSize: 28, padding: 0, marginLeft: 8 }}>✕</button>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", position: "relative" }}
          onMouseLeave={() => setMapTooltip(null)}
          onMouseMove={e => {
            const rect = bigMapCanvasRef.current?.getBoundingClientRect();
            if (!rect) return;
            const zoom = MAP_ZOOM_LEVELS[mapZoom];
            const center = mapCenter || pos;
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            const tileX = Math.round(center.x + (mx / zoom.px) - zoom.radius);
            const tileY = Math.round(center.y + (my / zoom.px) - zoom.radius);
            const searchR = zoom.px <= 1 ? 6 : zoom.px <= 3 ? 4 : zoom.px <= 6 ? 2 : 1;
            let closest = null;
            let closestDist = Infinity;
            for (let dy = -searchR; dy <= searchR; dy++) {
              for (let dx = -searchR; dx <= searchR; dx++) {
                const ck = `${tileX + dx},${tileY + dy}`;
                const dist = dx * dx + dy * dy;
                if (cities[ck] && dist < closestDist) {
                  closestDist = dist;
                  closest = { type: "city", name: cities[ck].name };
                }
                if (caves[ck] && dist < closestDist) {
                  closestDist = dist;
                  closest = { type: "cave", name: caves[ck].bossName, level: caves[ck].itemLevel };
                }
              }
            }
            if (closest) {
              setMapTooltip({ ...closest, x: e.clientX, y: e.clientY });
            } else {
              setMapTooltip(null);
            }
          }}
          onWheel={e => {
            e.preventDefault();
            const zoomIn = e.deltaY < 0;
            const newZoom = zoomIn ? Math.min(3, mapZoom + 1) : Math.max(0, mapZoom - 1);
            if (newZoom === mapZoom) return;

            // Calculate world tile under cursor
            const rect = bigMapCanvasRef.current?.getBoundingClientRect();
            if (rect && zoomIn) {
              const zoom = MAP_ZOOM_LEVELS[mapZoom];
              const center = mapCenter || pos;
              const mx = e.clientX - rect.left;
              const my = e.clientY - rect.top;
              const tileX = Math.round(center.x + (mx / zoom.px) - zoom.radius);
              const tileY = Math.round(center.y + (my / zoom.px) - zoom.radius);
              const newCx = Math.round(center.x + (tileX - center.x) * 0.4);
              const newCy = Math.round(center.y + (tileY - center.y) * 0.4);
              setMapCenter({ x: Math.max(0, Math.min(WORLD_SIZE - 1, newCx)), y: Math.max(0, Math.min(WORLD_SIZE - 1, newCy)) });
            } else {
              // Zoom out: recenter on player
              setMapCenter(null);
            }
            setMapZoom(newZoom);
          }}
        >
          <canvas ref={bigMapCanvasRef} style={{ borderRadius: 6, border: "1px solid #d4af3733", imageRendering: "pixelated", cursor: fastTravelMode ? "pointer" : "default" }}
            onClick={e => {
              if (!fastTravelMode) return;
              const rect = bigMapCanvasRef.current?.getBoundingClientRect();
              if (!rect) return;
              const zoom = MAP_ZOOM_LEVELS[mapZoom];
              const center = mapCenter || pos;
              const mx = e.clientX - rect.left;
              const my = e.clientY - rect.top;
              const tileX = Math.round(center.x + (mx / zoom.px) - zoom.radius);
              const tileY = Math.round(center.y + (my / zoom.px) - zoom.radius);
              const searchR = zoom.px <= 1 ? 6 : zoom.px <= 3 ? 4 : zoom.px <= 6 ? 2 : 1;
              let closest = null, closestDist = Infinity;
              for (let dy = -searchR; dy <= searchR; dy++) {
                for (let dx = -searchR; dx <= searchR; dx++) {
                  const ck = `${tileX + dx},${tileY + dy}`;
                  const dist = dx * dx + dy * dy;
                  if (cities[ck] && visitedCities.has(cities[ck].name) && dist < closestDist) {
                    closestDist = dist;
                    closest = { name: cities[ck].name, x: cities[ck].x, y: cities[ck].y };
                  }
                }
              }
              if (closest) setFastTravelConfirm(closest);
            }}
          />
        </div>
        {mapTooltip && (
          <div style={{
            position: "fixed", left: mapTooltip.x + 12, top: mapTooltip.y - 10,
            background: "rgba(5,8,25,0.95)", border: `1px solid ${mapTooltip.type === "cave" ? "#ef4444" : "#d4af37"}`,
            borderRadius: 6, padding: "4px 10px", fontSize: 14, fontWeight: 600,
            color: mapTooltip.type === "cave" ? "#ef4444" : "#d4af37",
            pointerEvents: "none", zIndex: 9999,
            boxShadow: "0 2px 8px #000a",
          }}>
            {mapTooltip.type === "cave"
              ? `🕳️ ${mapTooltip.name} — Lv.${mapTooltip.level}`
              : `🏰 ${mapTooltip.name}`}
          </div>
        )}
        <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 10, fontSize: 15, opacity: 0.7, flexWrap: "wrap" }}>
          <span>🔴 You</span>
          <span style={{ color: "#d4af37" }}>■ City</span>
          <span style={{ color: "#4ade80" }}>■ Quest turn-in</span>
          <span style={{ color: "#ff88ff" }}>■ Delivery target</span>
          <span>📍 {pos.x}, {pos.y}</span>
          <span style={S.badge(difficulty.color)}>{difficulty.name}</span>
          <span style={{ opacity: 0.5 }}>Scroll to zoom</span>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 6, fontSize: 14, opacity: 0.5, flexWrap: "wrap" }}>
          {Object.entries(BIOME_COLORS).map(([name, color]) => (
            <span key={name} style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ display: "inline-block", width: 8, height: 8, background: color, borderRadius: 2 }} />
              {name}
            </span>
          ))}
        </div>
      </div>
      {fastTravelConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1200 }}
          onClick={() => setFastTravelConfirm(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "rgba(15,20,45,0.99)", border: "1px solid #60a5fa88", borderRadius: 10,
            padding: "24px 28px", textAlign: "center", minWidth: 260, boxShadow: "0 8px 32px #000c",
          }}>
            <CastleSVG size={48}/>
            <div style={{ ...S.gold, fontSize: 19, fontWeight: 700, margin: "12px 0 6px 0" }}>Fast Travel</div>
            <div style={{ fontSize: 16, opacity: 0.8, marginBottom: 18 }}>
              Travel to <strong style={S.gold}>{fastTravelConfirm.name}</strong>?
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button style={{ ...S.btn, ...S.btnSuccess, padding: "8px 24px", fontSize: 16 }} onClick={() => {
                setPos({ x: fastTravelConfirm.x, y: fastTravelConfirm.y });
                setCurrentCity(Object.values(cities).find(c => c.name === fastTravelConfirm.name) || null);
                setScreen("city");
                addLog(`🏰 Fast Traveled to ${fastTravelConfirm.name}`);
                setFastTravelConfirm(null);
                setFastTravelMode(false);
                setWorldMapOpen(false);
              }}>Yes</button>
              <button style={{ ...S.btn, ...S.btnDanger, padding: "8px 24px", fontSize: 16 }} onClick={() => setFastTravelConfirm(null)}>No</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const levelUpPopup = levelUpMsg && screen !== "combat" && (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        ...S.panel, maxWidth: 380, width: "90%", textAlign: "center",
        border: "2px solid #d4af37", boxShadow: "0 0 40px #d4af3744",
        animation: "none",
      }}>
        <div style={{ fontSize: 52, marginBottom: 4 }}>🎉</div>
        <h2 style={{ ...S.gold, margin: "0 0 6px 0", fontSize: 28 }}>Level Up!</h2>
        <div style={{ fontSize: 42, fontWeight: 800, color: "#d4af37", marginBottom: 6 }}>{levelUpMsg}</div>
        <div style={{ fontSize: 17, opacity: 0.7, marginBottom: 4 }}>HP & Mana fully restored</div>
        <div style={{ fontSize: 17, color: "#4ade80", fontWeight: 600, marginBottom: 12 }}>+2 Stat Points available!</div>
        <button onClick={() => setLevelUpMsg(null)} style={{ ...S.btn, ...S.btnSuccess, padding: "10px 32px", fontSize: 19 }}>Continue</button>
      </div>
    </div>
  );

  const abilityChoicePopupElement = abilityChoicePopup && !levelUpMsg && screen !== "combat" && skillsOpen && (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3001,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        ...S.panel, maxWidth: 600, width: "90%",
        border: "2px solid #d4af37", boxShadow: "0 0 40px #d4af3744",
      }}>
        <h2 style={{ ...S.gold, margin: "0 0 16px 0", fontSize: 28, textAlign: "center" }}>✨ Choose a New Ability! ✨</h2>
        
        <AbilityCards abilityChoicePopup={abilityChoicePopup} learnAbility={learnAbility} />
      </div>
    </div>
  );

  
  const potionUseModalElement = potionUseModal && (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3002,
    }}>
      <div style={{
        ...S.panel, maxWidth: 420, width: "90%", textAlign: "center",
        border: "2px solid #60a5fa", boxShadow: "0 0 40px #60a5fa44",
      }}>
        <div style={{ fontSize: 64, marginBottom: 16, animation: "pulse 1.5s ease-in-out infinite" }}>🧪</div>
        <h2 style={{ ...S.gold, margin: "0 0 16px 0", fontSize: 24 }}>POTION OF PROTECTION</h2>
        
        <div style={{ fontSize: 16, opacity: 0.8, lineHeight: 1.8, marginBottom: 24 }}>
          You uncork the shimmering<br/>
          potion and drink it...<br/><br/>
          <span style={{ color: "#60a5fa", fontWeight: 600 }}>✨ A protective aura<br/>
          surrounds you!</span><br/><br/>
          <span style={{ color: "#4ade80", fontSize: 18, fontWeight: 700 }}>💪 "I can feel its power!"</span>
        </div>
      </div>
    </div>
  );

  const introPopupOverlay = introPopup && (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000, overflowY: "auto", padding: "20px 0",
    }}>
      <div style={{
        ...S.panel, maxWidth: 580, width: "92%", textAlign: "center",
        border: "2px solid #d4af37", boxShadow: "0 0 60px #d4af3755",
      }}>
        <div style={{ fontSize: 52, marginBottom: 10 }}>⚔️</div>
        <h2 style={{ color: "#d4af37", margin: "0 0 20px 0", fontSize: 28, letterSpacing: 2 }}>Realm of Shadows</h2>
        <div style={{ fontSize: 21, opacity: 0.9, lineHeight: 2, marginBottom: 28, fontStyle: "italic", textAlign: "left" }}>
          <p style={{ marginTop: 0 }}>The cold mud presses against your cheek. You open your eyes.</p>
          <p>The last thing you remember—a cave <CaveSVG size={28} />. Darkness that moved. Claws. The screaming of Monsters. The Realm of Shadows.</p>
          <p>It's gone for now. You are alive only because something chose to leave you that way — and you do not know if that is mercy or cruelty.</p>
          <p>You are a sellsword without a sword worth selling. The caves <CaveSVG size={28} /> bleed their filth into this world without end — monsters pouring forth like a wound that will not close. You have watched the darkness take everything from everyone.</p>
          <p>You swore you would seal every last one of them.</p>
          <p>That oath still stands. But oaths do not buy steel.</p>
          <p>Ahead, through the morning fog, torchlight flickers on a city wall. Someone survived the night. Someone always does.</p>
          <p>Get up. Find work. Get paid. Get back in the fight.</p>
          <p style={{ marginBottom: 0, fontWeight: 700, fontSize: 24, fontStyle: "normal" }}>The caves <CaveSVG size={32} /> are still out there. And they are still bleeding.</p>
        </div>
        <button
          onClick={() => { setIntroPopup(null); setScreen("city"); }}
          style={{ ...S.btn, ...S.btnSuccess, padding: "12px 32px", fontSize: 20 }}
        >
          <CastleSVG size={22} /> Enter {introPopup.name}
        </button>
      </div>
    </div>
  );

  const deathPopupOverlay = deathPopup && (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000,
    }}>
      <div style={{
        ...S.panel, maxWidth: 460, width: "90%", textAlign: "center",
        border: "2px solid #ef4444", boxShadow: "0 0 40px #ef444444",
      }}>
        <div style={{ fontSize: 52, marginBottom: 4 }}>💀</div>
        <h2 style={{ color: "#ef4444", margin: "0 0 10px 0", fontSize: 26 }}>You Have Fallen</h2>
        <div style={{ fontSize: 16, opacity: 0.8, lineHeight: 1.6, marginBottom: 14, fontStyle: "italic" }}>
          {deathPopup.story}
        </div>
        <div style={{ fontSize: 15, opacity: 0.6, marginBottom: 6, borderTop: "1px solid #ef444433", paddingTop: 10 }}>
          Lost <span style={{ color: "#d4af37", fontWeight: 700 }}>{deathPopup.goldLost} gold</span> and <span style={{ color: "#ef4444", fontWeight: 700 }}>{deathPopup.itemsLost} item{deathPopup.itemsLost !== 1 ? "s" : ""}</span>
        </div>
        <div style={{ fontSize: 15, opacity: 0.6, marginBottom: 14 }}>
          {deathPopup.respawnCity
            ? <>You will awaken in <span style={{ color: "#d4af37", fontWeight: 600 }}>{deathPopup.respawnCity}</span>, the last town you visited.</>
            : <>You will awaken at your starting location, far from civilization.</>
          }
        </div>
        <button onClick={deathPopup.onContinue} style={{ ...S.btn, ...S.btnDanger, padding: "10px 32px", fontSize: 19 }}>Rise Again</button>
      </div>
    </div>
  );

  // ---- SCREENS ----

  if (screen === "combat" && enemy) {
    const spriteKey = enemy.sprite || enemy.bossSprite || "leaf_goblin";
    const lastLog = combatLog.length > 0 ? combatLog[combatLog.length - 1] : "";
    const playerHit = lastLog.includes("You deal") || lastLog.includes("CRITICAL");
    const enemyHit = lastLog.includes(`${enemy.name} deals`);
    const playerDodge = lastLog.includes("dodged");

    return (
      <div style={S.app}>
        {questLogOverlay}
        {levelUpPopup}
        {abilityChoicePopupElement}
        {potionUseModalElement}
        {deathPopupOverlay}
        {worldMapOverlay}
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", maxWidth: 960, width: "100%" }}>
          {/* Combat Log - Left */}
          <div ref={combatLogRef} style={{ ...S.panel, flex: "0 0 240px", height: 420, overflowY: "auto", marginBottom: 0 }}>
            <div style={{ fontSize: 14, opacity: 0.5, marginBottom: 6 }}>Combat Log</div>
            {combatLog.map((msg, i) => {
              // ✅ Parse **text** to bold
              const parts = msg.split(/(\*\*[^*]+\*\*)/);
              return (
                <div key={i} style={{ fontSize: 14, padding: "4px 0", borderBottom: "1px solid #d4af3711" }}>
                  {parts.map((part, idx) => {
                    if (part.startsWith("**") && part.endsWith("**")) {
                      return <span key={idx} style={{ fontWeight: 700, color: "#d4af37" }}>{part.slice(2, -2)}</span>;  // ✅ Bold + Gold color
                    }
                    return <span key={idx}>{part}</span>;
                  })}
                </div>
              );
            })}
          </div>

          {/* Combat Panel - Right */}
          <div style={{ flex: 1, maxWidth: 620, position: "relative" }}>
            <div style={{ ...S.panel, textAlign: "center" }}>
              <h2 style={{ ...S.gold, margin: "0 0 8px 0", fontSize: 24 }}>⚔️ Combat</h2>

              {/* Arena */}
              <div style={{
                display: "flex", justifyContent: "space-around", alignItems: "center",
                background: "radial-gradient(ellipse at center, #1a1a2e 0%, #0d0d1a 100%)",
                borderRadius: 12, padding: "20px 10px", marginBottom: 12,
                border: "1px solid #d4af3722", position: "relative", minHeight: 180,
              }}>
                {/* Player */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1 }}>
                  <div style={{
                    width: 120, height: 120, borderRadius: 12,
                    background: "radial-gradient(circle, #1a1a2e, #0a0a12)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: playerHit ? "0 0 20px #4ade80aa" : playerDodge ? "0 0 20px #60a5faaa" : "0 0 8px #0008",
                    transition: "box-shadow 0.3s", overflow: "hidden",
                  }}>
                    <HeroImage size={110} heroUrl={heroUrl} />
                  </div>
                  {/* ✅ NEW: Player Name + Status Badge */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{playerName}</div>
                    {/* Level badge — color always white for player */}
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#facc15", letterSpacing: 1 }}>
                      Lv.{level}
                    </div>
                    {playerStatus.type && playerStatus.duration > 0 && (
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        background: (() => {
                          if (playerStatus.type === "burn") return "rgba(255, 107, 53, 0.15)";
                          if (playerStatus.type === "bleed") return "rgba(196, 30, 58, 0.15)";
                          if (playerStatus.type === "poison") return "rgba(74, 222, 128, 0.15)";
                          if (playerStatus.type === "slow") return "rgba(96, 165, 250, 0.15)";
                          if (playerStatus.type === "stun") return "rgba(251, 191, 36, 0.15)";
                          return "rgba(255, 255, 255, 0.05)";
                        })(),
                        padding: "4px 8px",
                        borderRadius: 4,
                        fontSize: 14,
                        fontWeight: 700,
                        border: (() => {
                          if (playerStatus.type === "burn") return "1px solid rgba(255, 107, 53, 0.4)";
                          if (playerStatus.type === "bleed") return "1px solid rgba(196, 30, 58, 0.4)";
                          if (playerStatus.type === "poison") return "1px solid rgba(74, 222, 128, 0.4)";
                          if (playerStatus.type === "slow") return "1px solid rgba(96, 165, 250, 0.4)";
                          if (playerStatus.type === "stun") return "1px solid rgba(251, 191, 36, 0.4)";
                          return "1px solid rgba(255, 255, 255, 0.2)";
                        })(),
                      }}>
                        <span style={{ fontSize: 16 }}>
                          {playerStatus.type === "burn" ? "🔥" : 
                           playerStatus.type === "bleed" ? "🩸" :
                           playerStatus.type === "poison" ? "☠️" :
                           playerStatus.type === "slow" ? "❄️" :
                           playerStatus.type === "stun" ? "😵" : ""}
                        </span>
                        <span style={{
                          minWidth: 16,
                          textAlign: "center",
                          color: playerStatus.type === "burn" ? "#ff6b35" :
                                 playerStatus.type === "bleed" ? "#c41e3a" :
                                 playerStatus.type === "poison" ? "#4ade80" :
                                 playerStatus.type === "slow" ? "#60a5fa" :
                                 playerStatus.type === "stun" ? "#fbbf24" : "#fff"
                        }}>
                          {playerStatus.duration}
                        </span>
                      </div>
                    )}
                    
                    {/* ✅ NEW: PLAYER BUFF BADGES */}
                    {playerBuffs.active.length > 0 && (
                      <div style={{ display: "flex", gap: 6 }}>
                        {playerBuffs.active.map((buff) => (
                          <div key={buff.type} style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 3,
                            padding: "4px 8px",
                            borderRadius: 4,
                            fontSize: 13,
                            fontWeight: 700,
                            background: buff.type === "critBoost" ? "rgba(255, 215, 0, 0.2)" :
                                       buff.type === "defense" ? "rgba(100, 180, 255, 0.2)" :
                                       buff.type === "stealth" ? "rgba(100, 200, 150, 0.2)" : "rgba(255, 255, 255, 0.1)",
                            border: buff.type === "critBoost" ? "1px solid rgba(255, 215, 0, 0.4)" :
                                   buff.type === "defense" ? "1px solid rgba(100, 180, 255, 0.4)" :
                                   buff.type === "stealth" ? "1px solid rgba(100, 200, 150, 0.4)" : "1px solid rgba(255, 255, 255, 0.2)",
                            color: buff.type === "critBoost" ? "#ffd700" :
                                  buff.type === "defense" ? "#64b4ff" :
                                  buff.type === "stealth" ? "#64c896" : "#fff"
                          }}>
                            <span style={{ fontSize: 14 }}>{getBuffEmoji(buff.type)}</span>
                            <span>{buff.charges || buff.duration}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ width: "100%", maxWidth: 120 }}>
                    <HealthBar current={hp} max={stats.maxHp} pulse />
                  </div>
                </div>

                {/* VS */}
                <div style={{ fontSize: 32, fontWeight: 900, color: "#d4af37", textShadow: "0 0 12px #d4af3766", padding: "0 8px" }}>VS</div>

                {/* Enemy with sprite */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1 }}>
                  <div style={{
                    width: 120, height: 120, borderRadius: 12,
                    background: "radial-gradient(circle, #1a1a2e, #0a0a12)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: enemyHit ? `0 0 20px ${enemy.isBoss ? "#ff8000aa" : "#ef4444aa"}` : "0 0 8px #0008",
                    transition: "box-shadow 0.3s", overflow: "hidden",
                  }}>
                    <SpriteImage spriteKey={spriteKey} size={110} spriteSheetUrl={spriteSheetUrl} />
                  </div>
                  {/* ✅ NEW: Enemy Name + Status Badge */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: enemy.isBoss ? "#ff8000" : "#ef4444" }}>
                      {enemy.isBoss ? "👑 " : ""}{enemy.name}
                    </div>
                    {enemyStatus.type && enemyStatus.duration > 0 && (
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        background: (() => {
                          if (enemyStatus.type === "burn") return "rgba(255, 107, 53, 0.15)";
                          if (enemyStatus.type === "bleed") return "rgba(196, 30, 58, 0.15)";
                          if (enemyStatus.type === "poison") return "rgba(74, 222, 128, 0.15)";
                          if (enemyStatus.type === "slow") return "rgba(96, 165, 250, 0.15)";
                          if (enemyStatus.type === "stun") return "rgba(251, 191, 36, 0.15)";
                          return "rgba(255, 255, 255, 0.05)";
                        })(),
                        padding: "4px 8px",
                        borderRadius: 4,
                        fontSize: 14,
                        fontWeight: 700,
                        border: (() => {
                          if (enemyStatus.type === "burn") return "1px solid rgba(255, 107, 53, 0.4)";
                          if (enemyStatus.type === "bleed") return "1px solid rgba(196, 30, 58, 0.4)";
                          if (enemyStatus.type === "poison") return "1px solid rgba(74, 222, 128, 0.4)";
                          if (enemyStatus.type === "slow") return "1px solid rgba(96, 165, 250, 0.4)";
                          if (enemyStatus.type === "stun") return "1px solid rgba(251, 191, 36, 0.4)";
                          return "1px solid rgba(255, 255, 255, 0.2)";
                        })(),
                      }}>
                        <span style={{ fontSize: 16 }}>
                          {enemyStatus.type === "burn" ? "🔥" : 
                           enemyStatus.type === "bleed" ? "🩸" :
                           enemyStatus.type === "poison" ? "☠️" :
                           enemyStatus.type === "slow" ? "❄️" :
                           enemyStatus.type === "stun" ? "😵" : ""}
                        </span>
                        <span style={{
                          minWidth: 16,
                          textAlign: "center",
                          color: enemyStatus.type === "burn" ? "#ff6b35" :
                                 enemyStatus.type === "bleed" ? "#c41e3a" :
                                 enemyStatus.type === "poison" ? "#4ade80" :
                                 enemyStatus.type === "slow" ? "#60a5fa" :
                                 enemyStatus.type === "stun" ? "#fbbf24" : "#fff"
                        }}>
                          {enemyStatus.duration}
                        </span>
                      </div>
                    )}
                    
                    {/* ✅ NEW: ENEMY BUFF BADGES */}
                    {enemyBuffs.active.length > 0 && (
                      <div style={{ display: "flex", gap: 6 }}>
                        {enemyBuffs.active.map((buff) => (
                          <div key={buff.type} style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 3,
                            padding: "4px 8px",
                            borderRadius: 4,
                            fontSize: 13,
                            fontWeight: 700,
                            background: buff.type === "critBoost" ? "rgba(255, 215, 0, 0.2)" :
                                       buff.type === "defense" ? "rgba(100, 180, 255, 0.2)" :
                                       buff.type === "stealth" ? "rgba(100, 200, 150, 0.2)" : "rgba(255, 255, 255, 0.1)",
                            border: buff.type === "critBoost" ? "1px solid rgba(255, 215, 0, 0.4)" :
                                   buff.type === "defense" ? "1px solid rgba(100, 180, 255, 0.4)" :
                                   buff.type === "stealth" ? "1px solid rgba(100, 200, 150, 0.4)" : "1px solid rgba(255, 255, 255, 0.2)",
                            color: buff.type === "critBoost" ? "#ffd700" :
                                  buff.type === "defense" ? "#64b4ff" :
                                  buff.type === "stealth" ? "#64c896" : "#fff"
                          }}>
                            <span style={{ fontSize: 14 }}>{getBuffEmoji(buff.type)}</span>
                            <span>{buff.charges || buff.duration}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Level badge — color relative to player level */}
                  <EnemyLevelBadge enemyLevel={enemy.level} playerLevel={level} />
                  <div style={{ width: "100%", maxWidth: 120 }}>
                    <HealthBar current={enemyHp} max={enemy.hp} pulse />
                  </div>

                  {/* ✅ Floating Damage Texts */}
                  {floatingDamages.map(fd => (
                    <FloatingDamageText
                      key={fd.id}
                      damage={fd.damage}
                      x={fd.x}
                      y={fd.y}
                      isCrit={fd.isCrit}
                      isHeal={fd.isHeal}
                      isBuff={fd.isBuff}
                      isMiss={fd.isMiss}
                    />
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 12, flexWrap: "wrap" }}>
                <button onClick={attack} style={{ ...S.btn, ...S.btnDanger, flex: 1, minWidth: 80 }} disabled={enemyHp <= 0}>⚔️ Attack</button>
                <button onClick={() => setCombatItemsOpen(prev => !prev)} style={{ ...S.btn, ...S.btnSuccess, flex: 1, minWidth: 80, ...(combatItemsOpen ? { borderColor: "#4ade80", background: "linear-gradient(180deg, #1a2a0e, #0f1a08)" } : {}) }} disabled={enemyHp <= 0}>🧪 Items</button>
                <button onClick={() => setSkillsOpen(prev => !prev)} style={{ ...S.btn, flex: 1, minWidth: 80, ...(skillsOpen ? { borderColor: "#a0c4ff", background: "linear-gradient(180deg, #0e1a3a, #081028)" } : {}), borderColor: (learnedAbilities.spells.length > 0 || learnedAbilities.specials.length > 0) ? "#a0c4ff" : "#999", color: (learnedAbilities.spells.length > 0 || learnedAbilities.specials.length > 0) ? "#a0c4ff" : "#999" }} disabled={enemyHp <= 0 || (learnedAbilities.spells.length === 0 && learnedAbilities.specials.length === 0)}>✨ Skills</button>
                <button onClick={flee} style={{ ...S.btn, flex: 1, minWidth: 80 }} disabled={enemyHp <= 0}>🏃 Flee</button>
              </div>
              {combatItemsOpen && enemyHp > 0 && <CombatItemsPanel inventory={inventory} useItemInCombat={useItemInCombat} />}
              {/* ✅ NEW: Combined SKILLS (Spells + Specials) */}
              {skillsOpen && enemyHp > 0 && (learnedAbilities.spells.length > 0 || learnedAbilities.specials.length > 0) && (
                <div style={{ background: "#1a3a5a11", borderRadius: 8, padding: 12, marginBottom: 12, border: "1px solid #4169E133" }}>
                  <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 10, fontWeight: 700, color: "#a0c4ff" }}>✨ SKILLS</div>
                  
                  {/* Skills Grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(60px, 1fr))", gap: 8, marginBottom: 8 }}>
                    {/* SPELLS */}
                    {learnedAbilities.spells.map(spellId => {
                      const spell = SPELLS.find(s => s.id === spellId);
                      if (!spell) return null;
                      return (
                        <SpellButton
                          key={spell.id}
                          spell={spell}
                          mana={mana}
                          maxMana={stats.maxMana}
                          damage={stats.damage}
                          onCast={castSpell}
                          disabled={enemyHp <= 0}
                        />
                      );
                    })}
                    
                    {/* SPECIALS */}
                    {learnedAbilities.specials.map(specialId => {
                      const special = SPECIALS.find(s => s.id === specialId);
                      if (!special) return null;
                      return (
                        <SpecialButton
                          key={special.id}
                          special={special}
                          hp={hp}
                          maxHp={stats.maxHp}
                          onUse={useSpecial}
                          disabled={enemyHp <= 0}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "city" && currentCity) {
    return (
      <div style={S.app}>
        {questLogOverlay}
        {levelUpPopup}
        {abilityChoicePopupElement}
        {deathPopupOverlay}
        {worldMapOverlay}
        <div style={{ maxWidth: 560, width: "100%", display: "flex", flexDirection: "column", height: "auto", maxHeight: "calc(100vh - 80px)" }}>
          <PlayerHeader {...{ playerName, level, xp, xpToLevel, gold, hp, mana, stats }} />

          {/* ✅ Scrollable content area */}
          <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
            <div style={{ ...S.panel, textAlign: "center" }}>
              <h2 style={{ ...S.gold, margin: "0 0 4px 0", fontSize: 26, display: "flex", alignItems: "center", gap: 8 }}><CastleSVG size={112} /> {currentCity.name}</h2>
              <span style={S.badge(TIER_COLORS[currentCity.difficulty] || "#d4af37")}>{currentCity.difficulty}</span>
            </div>

            {activeQuests.length > 0 && (
              <div style={S.panel}>
                <div style={{ fontSize: 17, fontWeight: 700, ...S.gold, marginBottom: 6 }}>Active Quests ({activeQuests.length})</div>
                {activeQuests.map(q => {
                  const progress = getQuestProgress(q);
                  const target = q.questKind === "chunkBossHunt" ? q.targetBosses : q.targetCount;
                  const complete = progress >= target;
                  const icon = q.questKind === "kill" ? <KillSVG size={18}/> : q.questKind === "deliver" ? <DeliverSVG size={18}/> : q.questKind === "chunkBossHunt" ? <WeaponSVG size={18}/> : <GatherSVG size={18}/>;
                  return (
                    <div key={q.id} style={{ fontSize: 21, padding: "6px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>{icon} {q.title} ({progress}/{target})</span>
                      <span style={{ fontSize: 17, opacity: 0.6 }}>
                        {complete ? "✅ Ready" : `📍 ${q.originCity} (${q.originX}, ${q.originY})`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8, padding: "0 12px" }}>
              <button onClick={() => setScreen("merchant")} style={{ ...S.btn, display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}><MerchantSVG size={36}/> Merchant</button>
              <button onClick={() => setScreen("blacksmith")} style={{ ...S.btn, display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}><BlacksmithSVG size={36}/> Blacksmith</button>
              <button onClick={() => setScreen("inn")} style={{ ...S.btn, display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}><InnSVG size={36}/> Inn</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20, padding: "0 12px" }}>
              <button onClick={() => setScreen("questgiver")} style={{ ...S.btn, display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}><WeaponSVG size={36}/> Questgiver</button>
              <button onClick={() => setScreen("bulletin")} style={{ ...S.btn, display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}><BulletinSVG size={36}/> Bulletin Board</button>
            </div>

            {/* Fast Travel */}
            <div style={{ padding: "0 12px", marginBottom: 8 }}>
              <button
                onClick={() => { setFastTravelMode(true); setWorldMapOpen(true); }}
                style={{ ...S.btn, width: "100%", display:"flex", alignItems:"center", justifyContent:"center", gap:8, borderColor: "#60a5fa", color: "#60a5fa" }}
                disabled={visitedCities.size <= 1}
              >
                <CastleSVG size={28}/> Fast Travel {visitedCities.size <= 1 ? "(visit more cities)" : `(${visitedCities.size} cities)`}
              </button>
            </div>

            {/* ✅ Leave City Button - im Content Flow */}
            <div style={{ padding: "0 12px", marginBottom: 20 }}>
              <button onClick={() => { setScreen("world"); setCurrentCity(null); addLog(`Left ${currentCity.name}`); }} style={{ ...S.btn, ...S.btnDanger, width: "100%", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}><LeaveSVG size={36}/> Leave City</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "inn" && currentCity) {
    const hpMissing = stats.maxHp - hp;
    const manaMissing = stats.maxMana - mana;
    const paidTicksNeeded = innHealPerTick > 0 ? Math.ceil(hpMissing / innHealPerTick) : 0;
    const totalCostEstimate = paidTicksNeeded * innCostPerTick;
    return (
      <div style={S.app}>
        {questLogOverlay}
        {levelUpPopup}
        {abilityChoicePopupElement}
        {deathPopupOverlay}
        {worldMapOverlay}
        <div style={{ maxWidth: 560, width: "100%" }}>
          <PlayerHeader {...{ playerName, level, xp, xpToLevel, gold, hp, mana, stats }} />
          <div style={S.panel}>
            <h2 style={{ ...S.gold, margin: "0 0 14px 0", fontSize: 28, display:"flex", alignItems:"center", gap:10 }}><InnSVG size={64}/> Inn</h2>
            <div style={{ fontSize: 16, opacity: 0.6, marginBottom: 14 }}>
              Welcome, weary traveler. Rest and recover your strength.
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ background: "#ffffff06", borderRadius: 8, padding: 14, border: "1px solid #d4af3722" }}>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, display:"flex", alignItems:"center", gap:6 }}><CampfireSVG size={28}/> Campfire</div>
                <div style={{ fontSize: 14, opacity: 0.6, marginBottom: 4 }}>Rest on the floor for free</div>
                <div style={{ fontSize: 14, color: "#4ade80", marginBottom: 8 }}>+1 HP/s • +1 Mana/s</div>
                <button
                  onClick={() => { setResting(true); setRestType("free"); setScreen("resting"); }}
                  style={{ ...S.btn, width: "100%", ...(hp >= stats.maxHp ? S.btnDisabled : {}) }}
                  disabled={hp >= stats.maxHp}
                >Rest (Free)</button>
              </div>

              <div style={{ background: "#d4af3708", borderRadius: 8, padding: 14, border: "1px solid #d4af3733" }}>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, color: "#d4af37", display:"flex", alignItems:"center", gap:6 }}><BedSVG size={28}/> Warm Bed</div>
                <div style={{ fontSize: 14, opacity: 0.6, marginBottom: 4 }}>A comfortable room with meals</div>
                <div style={{ fontSize: 14, color: "#4ade80", marginBottom: 2 }}>+{innHealPerTick} HP/s ({Math.round(innRate * 100)}% max HP)</div>
                <div style={{ fontSize: 14, color: "#d4af37", marginBottom: 2 }}>{innCostPerTick}g per second</div>
                {hpMissing > 0 && <div style={{ fontSize: 13, opacity: 0.5, marginBottom: 6 }}>≈ {totalCostEstimate}g for full heal</div>}
                <button
                  onClick={() => { if (gold >= innCostPerTick) { setResting(true); setRestType("paid"); setScreen("resting"); } }}
                  style={{ ...S.btn, width: "100%", ...(gold < innCostPerTick || hp >= stats.maxHp ? S.btnDisabled : {}) }}
                  disabled={gold < innCostPerTick || hp >= stats.maxHp}
                >Rest ({innCostPerTick}g/s)</button>
              </div>
            </div>
          </div>
          <button onClick={() => setScreen("city")} style={{ ...S.btn, width: "100%" }}>← Back</button>
        </div>
      </div>
    );
  }

  if (screen === "resting") {
    return (
      <div style={S.app}>
        {questLogOverlay}
        {levelUpPopup}
        {abilityChoicePopupElement}
        {deathPopupOverlay}
        {worldMapOverlay}
        <div style={{ maxWidth: 560, width: "100%" }}>
          <PlayerHeader {...{ playerName, level, xp, xpToLevel, gold, hp, mana, stats }} />
          <div style={{ ...S.panel, textAlign: "center" }}>
            <h2 style={{ ...S.gold, margin: "0 0 12px 0" }}>
              {restType === "paid" ? <><BedSVG size={28}/> Resting at the Inn</> : <><CampfireSVG size={28}/> Resting by the Campfire</>}
            </h2>
            <HealthBar current={hp} max={stats.maxHp} label="HP" />
            <HealthBar current={mana} max={stats.maxMana} label="Mana" isMana />
            <div style={{ marginTop: 12, fontSize: 19, opacity: 0.7 }}>
              {restType === "paid"
                ? `Healing ${innHealPerTick} HP/s • ${innCostPerTick}g/s`
                : "Healing 1 HP/s"}
            </div>
            <button onClick={() => { setResting(false); setScreen("inn"); }} style={{ ...S.btn, marginTop: 16, width: "100%" }}>Stop Resting</button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "merchant" && currentCity) {
    const items = generateMerchantPotions(level);
    return (
      <div style={S.app}>
        {questLogOverlay}
        {levelUpPopup}
        {abilityChoicePopupElement}
        {deathPopupOverlay}
        {worldMapOverlay}
        <div style={{ maxWidth: 560, width: "100%" }}>
          <PlayerHeader {...{ playerName, level, xp, xpToLevel, gold, hp, mana, stats }} />
          <div style={S.panel}>
            <h2 style={{ ...S.gold, margin: "0 0 12px 0", fontSize: 28, display:"flex", alignItems:"center", gap:10 }}><MerchantSVG size={64}/> Merchant</h2>
            {items.map((item, i) => {
              const owned = inventory.filter(inv => inv.name === item.name).length;
              return (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #d4af3711" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 21 }}>{item.name}{owned > 0 && <span style={{ fontSize: 15, opacity: 0.5, marginLeft: 6 }}>({owned} in bag)</span>}</div>
                  <div style={{ fontSize: 17, opacity: 0.6 }}>{item.effect === "repel" ? `No encounters for ${item.value} steps` : `${item.healPercent ? `Heals +${Math.round(item.healPercent * 100)}% HP` : `Heals ${item.value} HP`}`}</div>
                </div>
                <button onClick={() => buyItem(item)} style={{ ...S.btn, padding: "6px 14px", fontSize: 21, ...(gold < item.cost ? S.btnDisabled : {}) }}>
                  {item.cost}g
                </button>
              </div>
              );
            })}
          </div>
          <button onClick={() => setScreen("city")} style={{ ...S.btn, width: "100%" }}>← Back</button>
        </div>
      </div>
    );
  }

  if (screen === "blacksmith" && currentCity) {
    // ✅ NEW: Determine item level based on chunk (like shops now)
    const chunk = getChunkTier(currentCity.x, currentCity.y);
    let itemLevelMin = 1;
    let itemLevelMax = 1;
    
    if (chunk && chunk.levelRange) {
      // ✅ NEW: Items variieren zwischen den ersten 3 Levels des Chunks
      itemLevelMin = chunk.levelRange[0];
      itemLevelMax = Math.min(itemLevelMin + 2, chunk.levelRange[1]);
    } else if (chunk && chunk.isDynamic) {
      // For dynamic chunks, use player level
      itemLevelMin = Math.max(1, Math.min(50, level));
      itemLevelMax = itemLevelMin;
    }
    
    // ✅ NEW: Pass itemLevel range instead of single itemLevel
    const shopItems = generateShopItems(currentCity.name, itemLevelMin, itemLevelMax, worldSeed);
    const visibleItems = shopItems.filter(item => !item.unique || !boughtUniqueIds.has(item.uid));
    return (
      <div style={S.app}>
        {questLogOverlay}
        {levelUpPopup}
        {abilityChoicePopupElement}
        {deathPopupOverlay}
        {worldMapOverlay}
        <div style={{ maxWidth: 560, width: "100%" }}>
          <PlayerHeader {...{ playerName, level, xp, xpToLevel, gold, hp, mana, stats }} />
          <div style={S.panel}>
            <h2 style={{ ...S.gold, margin: "0 0 12px 0", fontSize: 28, display:"flex", alignItems:"center", gap:10 }}><BlacksmithSVG size={64}/> Blacksmith</h2>
            {visibleItems.map((item, i) => {
              const statEntries = item.bonusStats ? Object.entries(item.bonusStats) : [];
              return (
              <div key={item.uid || i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #d4af3711" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 19, color: item.rarityColor || "#ccc" }}>{item.name}</div>
                  <div style={{ fontSize: 15, opacity: 0.5 }}>
                    <span style={{ color: item.rarityColor, fontWeight: 600 }}>{item.rarity || "Normal"}</span>
                    {" • "}{item.slot.charAt(0).toUpperCase() + item.slot.slice(1)}
                    {item.itemLevel && <><span>{" • "}</span><span style={{ color: "#d4af37" }}>Lvl {item.itemLevel}</span></>}
                  </div>
                  <div style={{ fontSize: 14, display: "flex", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
                    {item.bonusDamage > 0 && <span style={{ color: "#ef4444" }}>+{item.bonusDamage} DMG</span>}
                    {item.bonusDefense > 0 && <span style={{ color: "#60a5fa" }}>+{item.bonusDefense} DEF</span>}
                    {statEntries.map(([stat, val]) => (
                      <span key={stat} style={{ color: "#d4af37" }}>+{val} {stat.slice(0,3).toUpperCase()}</span>
                    ))}
                  </div>
                </div>
                <button onClick={() => {
                  buyItem(item);
                  if (item.unique) setBoughtUniqueIds(prev => new Set([...prev, item.uid]));
                }} style={{ ...S.btn, padding: "6px 14px", fontSize: 19, ...(gold < item.cost ? S.btnDisabled : {}) }}>
                  {item.cost}g
                </button>
              </div>
              );
            })}
            {visibleItems.length === 0 && <div style={{ opacity: 0.5, fontSize: 17 }}>The blacksmith has nothing left to offer.</div>}
          </div>
          <button onClick={() => setScreen("city")} style={{ ...S.btn, width: "100%" }}>← Back</button>
        </div>
      </div>
    );
  }

  if (screen === "questgiver" && currentCity) {
    const cityQuests = getCityQuests(currentCity.name, currentCity.difficulty);
    const cityChunkX = Math.floor(currentCity.x / CHUNK_SIZE);
    const cityChunkY = Math.floor(currentCity.y / CHUNK_SIZE);

    const turnInableQuests = quests.filter(q => q.accepted && q.type === "questgiver" && isQuestComplete(q) && (
      (q.questKind === "deliver" && q.targetCity === currentCity.name) ||
      (q.questKind === "chunkBossHunt" && q.targetChunkX === cityChunkX && q.targetChunkY === cityChunkY) ||
      (q.questKind !== "deliver" && q.questKind !== "chunkBossHunt" && q.originCity === currentCity.name)
    ));
    // Filter out quests already taken (accepted or turned in)
    const availableQuests = cityQuests.filter(q => !completedQuestIds.has(q.id) && !quests.some(eq => eq.id === q.id));
    const pendingQuests = quests.filter(q => q.accepted && q.type === "questgiver" && !isQuestComplete(q) && (
      (q.questKind === "chunkBossHunt" && q.targetChunkX === cityChunkX && q.targetChunkY === cityChunkY) ||
      (q.questKind !== "chunkBossHunt" && q.originCity === currentCity.name)
    ));
    const allDone = availableQuests.length === 0 && turnInableQuests.length === 0 && pendingQuests.length === 0;
    return (
      <div style={S.app}>
        {questLogOverlay}
        {levelUpPopup}
        {abilityChoicePopupElement}
        {deathPopupOverlay}
        {worldMapOverlay}
        <div style={{ maxWidth: 560, width: "100%" }}>
          <PlayerHeader {...{ playerName, level, xp, xpToLevel, gold, hp, mana, stats }} />
          <div style={S.panel}>
            <h2 style={{ ...S.gold, margin: "0 0 12px 0", fontSize: 28, display:"flex", alignItems:"center", gap:10 }}><WeaponSVG size={64}/> Questgiver</h2>

            {turnInableQuests.length > 0 && (
              <div style={{ marginBottom: 12, padding: 8, background: "#4ade8011", borderRadius: 6, border: "1px solid #4ade8033" }}>
                <div style={{ fontSize: 21, fontWeight: 700, color: "#4ade80", marginBottom: 6 }}>Ready to Turn In</div>
                {turnInableQuests.map(q => (
                  <div key={q.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0" }}>
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 600 }}>{q.title}</div>
                      <div style={{ fontSize: 17, ...S.gold }}>Reward: {q.goldReward}g + {q.xpReward} XP</div>
                    </div>
                    <button onClick={() => turnInQuest(q.id)} style={{ ...S.btn, ...S.btnSuccess, padding: "6px 12px", fontSize: 21 }}>✅ Turn In</button>
                  </div>
                ))}
              </div>
            )}

            {allDone && (
              <div style={{ textAlign: "center", padding: "20px 12px" }}>
                <div style={{ display:"flex", justifyContent:"center", marginBottom: 10 }}><MedalSVG size={48}/></div>
                <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>"You have completed all my quests, brave warrior!"</div>
                <div style={{ fontSize: 16, opacity: 0.6 }}>"There is nothing more I can offer you here. Continue your journey and seek new challenges in distant lands."</div>
              </div>
            )}

            {pendingQuests.length > 0 && (
              <div style={{ marginBottom: 12, padding: 8, background: "#d4af3709", borderRadius: 6, border: "1px solid #d4af3722" }}>
                <div style={{ fontSize: 14, opacity: 0.5, marginBottom: 6 }}>In Progress</div>
                {pendingQuests.map(q => {
                  const progress = getQuestProgress(q);
                  const target = q.questKind === "chunkBossHunt" ? q.targetBosses : q.targetCount;
                  const kindIcon = q.questKind === "kill" ? <KillSVG size={18}/> : q.questKind === "deliver" ? <DeliverSVG size={18}/> : q.questKind === "chunkBossHunt" ? <WeaponSVG size={18}/> : <GatherSVG size={18}/>;
                  return (
                    <div key={q.id} style={{ fontSize: 15, padding: "4px 0", opacity: 0.7 }}>
                      {kindIcon} {q.title} — {progress}/{target}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ✅ BOSS HUNT QUESTS - SEPARATE HIGHLIGHTED SECTION */}
            {availableQuests.filter(q => q.questKind === "chunkBossHunt").length > 0 && (
              <div style={{ 
                marginBottom: 12, 
                padding: 12, 
                background: "#ef444422",  // ✅ Red tint for emphasis
                borderRadius: 8, 
                border: "2px solid #ef4444",  // ✅ Bold red border
                boxShadow: "0 0 16px #ef444433"  // ✅ Glow effect
              }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#ff6b6b", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                  <CrownSVG size={20}/> MAIN QUESTS <CrownSVG size={20}/>  {/* ✅ Main Quest label */}
                </div>
                {availableQuests.filter(q => q.questKind === "chunkBossHunt").map((q) => {
                  const kindIcon = "⚔️";
                  return (
                    <div key={q.id} style={{ 
                      padding: "12px", 
                      marginBottom: 8,
                      background: "#1a0a0a",  // ✅ Darker background
                      borderRadius: 6,
                      border: "1px solid #ef4444",
                      boxShadow: "inset 0 0 8px #ef444411"
                    }}>
                      <div style={{ fontWeight: 700, fontSize: 22, color: "#ff6b6b", marginBottom: 4 }}>
                        {kindIcon} {q.title}
                      </div>
                      <div style={{ fontSize: 16, opacity: 0.8, marginBottom: 6, color: "#ffa5a5" }}>
                        {q.description}
                      </div>
                      <div style={{ fontSize: 17, ...S.gold, marginBottom: 8 }}>
                        Reward: {q.goldReward}g + {q.xpReward} XP
                        {q.rewardLoot === "boss" && (
                          <span style={{ color: "#ff6b6b", fontWeight: 700 }}> + Chance for extra Equipment!</span>
                        )}
                      </div>
                      <button 
                        onClick={() => acceptQuest(q, currentCity.name, currentCity.x, currentCity.y)} 
                        style={{ 
                          ...S.btn, 
                          ...S.btnSuccess, 
                          padding: "8px 16px", 
                          fontSize: 18,
                          background: "linear-gradient(180deg, #ef4444, #dc2626)",  // ✅ Red gradient
                          borderColor: "#ff6b6b",
                          color: "#fff",
                          fontWeight: 700
                        }}
                      >
                        🎯 Accept Main Quest
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ✅ REGULAR QUESTS - Below main quests */}
            {availableQuests.filter(q => q.questKind !== "chunkBossHunt").length > 0 && (
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "#d4af37", marginBottom: 8, marginTop: 8 }}>Other Quests</div>
                {availableQuests.filter(q => q.questKind !== "chunkBossHunt").map((q) => {
                  const kindIcon = q.questKind === "kill" ? <KillSVG size={18}/> : q.questKind === "deliver" ? <DeliverSVG size={18}/> : <GatherSVG size={18}/>;
                  return (
                    <div key={q.id} style={{ padding: "10px 0", borderBottom: "1px solid #d4af3711" }}>
                      <div style={{ fontWeight: 600, fontSize: 21 }}>{kindIcon} {q.title}</div>
                      <div style={{ fontSize: 21, opacity: 0.7, marginBottom: 4 }}>{q.description}</div>
                      <div style={{ fontSize: 17, ...S.gold }}>Reward: {q.goldReward}g + {q.xpReward} XP</div>
                      <button onClick={() => acceptQuest(q, currentCity.name, currentCity.x, currentCity.y)} style={{ ...S.btn, ...S.btnSuccess, padding: "5px 12px", fontSize: 17, marginTop: 4 }}>Accept</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <button onClick={() => setScreen("city")} style={{ ...S.btn, width: "100%" }}>← Back</button>
        </div>
      </div>
    );
  }

  if (screen === "bulletin" && currentCity) {
    const bulletinQuests = getCityBulletin(currentCity.name, currentCity.difficulty);
    const turnInableQuests = quests.filter(q => q.accepted && q.type === "bulletin" && q.originCity === currentCity.name && isQuestComplete(q));
    return (
      <div style={S.app}>
        {questLogOverlay}
        {levelUpPopup}
        {abilityChoicePopupElement}
        {deathPopupOverlay}
        {worldMapOverlay}
        <div style={{ maxWidth: 560, width: "100%" }}>
          <PlayerHeader {...{ playerName, level, xp, xpToLevel, gold, hp, mana, stats }} />
          <div style={S.panel}>
            <h2 style={{ ...S.gold, margin: "0 0 12px 0", fontSize: 28, display:"flex", alignItems:"center", gap:10 }}><BulletinSVG size={64}/> Bulletin Board</h2>

            {turnInableQuests.length > 0 && (
              <div style={{ marginBottom: 12, padding: 8, background: "#4ade8011", borderRadius: 6, border: "1px solid #4ade8033" }}>
                <div style={{ fontSize: 21, fontWeight: 700, color: "#4ade80", marginBottom: 6 }}>Ready to Turn In</div>
                {turnInableQuests.map(q => (
                  <div key={q.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0" }}>
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 600 }}>{q.title}</div>
                      <div style={{ fontSize: 17, ...S.gold }}>Reward: {q.goldReward}g + {q.xpReward} XP</div>
                    </div>
                    <button onClick={() => turnInQuest(q.id)} style={{ ...S.btn, ...S.btnSuccess, padding: "6px 12px", fontSize: 21 }}>✅ Turn In</button>
                  </div>
                ))}
              </div>
            )}

            {bulletinQuests.map((q) => {
              // ✅ Prüfe ob diese Quest bereits akzeptiert und aktiv ist
              const alreadyActive = quests.some(eq => eq.id === q.id && eq.accepted);
              
              // ✅ Zeige Quest nur wenn NICHT aktiv
              if (alreadyActive) return null;
              
              const kindIcon = q.questKind === "kill" ? <KillSVG size={18}/> : q.questKind === "deliver" ? <DeliverSVG size={18}/> : <GatherSVG size={18}/>;
              return (
                <div key={q.id} style={{ padding: "10px 0", borderBottom: "1px solid #d4af3711" }}>
                  <div style={{ fontWeight: 600, fontSize: 21 }}>{kindIcon} {q.title}</div>
                  <div style={{ fontSize: 21, opacity: 0.7, marginBottom: 4 }}>{q.description}</div>
                  <div style={{ fontSize: 17, ...S.gold }}>Reward: {q.goldReward}g + {q.xpReward} XP</div>
                  <button onClick={() => acceptQuest({ ...q, killCount: 0 }, currentCity.name, currentCity.x, currentCity.y)} style={{ ...S.btn, ...S.btnSuccess, padding: "5px 12px", fontSize: 17, marginTop: 4 }}>Accept</button>
                </div>
              );
            })}
          </div>
          <button onClick={() => setScreen("city")} style={{ ...S.btn, width: "100%" }}>← Back</button>
        </div>
      </div>
    );
  }

  // WORLD SCREEN
  return (
    <div style={S.app}>
      {questLogOverlay}
        {levelUpPopup}
        {abilityChoicePopupElement}
        {introPopupOverlay}
        {deathPopupOverlay}
        {worldMapOverlay}
      <div style={{ maxWidth: 1000, width: "100%" }}>
        <PlayerHeader {...{ playerName, level, xp, xpToLevel, gold, hp, mana, stats }} />

        <div style={{ ...S.panel, display: "flex", gap: 8, flexWrap: "wrap", fontSize: 21, alignItems: "center" }}>
          <span>📍 {pos.x}, {pos.y}</span>
          <span style={S.badge(difficulty.color)}>{difficulty.name}</span>
          <span>{BIOME_EMOJI[biome]} {biome}</span>
          {activeQuests.length > 0 && <span style={{ ...S.gold }}>📜 {activeQuests.length} quest{activeQuests.length > 1 ? "s" : ""}</span>}
          {repelSteps > 0 && <span style={{ color: "#60a5fa", fontWeight: 600 }}>🧪 Stealth: {repelSteps} steps</span>}
          {cities[`${pos.x},${pos.y}`] && (
            <button onClick={() => {
              const city = cities[`${pos.x},${pos.y}`];
              setCurrentCity(city);
              setLastCity(city);
              setScreen("city");
              addLog(`🏰 Entered ${city.name}`);
            }} style={{ ...S.btn, ...S.btnSuccess, padding: "6px 14px", fontSize: 17, display: "flex", alignItems: "center", gap: 6 }}><CastleSVG size={20} /> Enter {cities[`${pos.x},${pos.y}`].name}</button>
          )}
          <button onClick={() => setWorldMapOpen(true)} style={{ ...S.btn, padding: "6px 14px", fontSize: 17 }}>🗺️ Map</button>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          {/* Map */}
          <div style={{ ...S.panel, padding: 4, display: "flex", justifyContent: "center", flexShrink: 0, marginBottom: 0 }}>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${VIEW_SIZE}, ${TILE_PX}px)`, gap: 1, overflow: "visible" }}>
              {renderMap()}
            </div>
          </div>

          {/* Event Log */}
          <div style={{ ...S.panel, flex: 1, minWidth: 160, maxHeight: VIEW_SIZE * (TILE_PX + 1) + 8, overflowY: "auto", marginBottom: 0 }}>
            <div style={{ fontSize: 17, opacity: 0.5, marginBottom: 6 }}>Event Log</div>
            {log.map((msg, i) => {
              // ✅ Parse **text** to bold
              const parts = msg.split(/(\*\*[^*]+\*\*)/);
              return (
                <div key={i} style={{ fontSize: 21, padding: "5px 0", opacity: 0.8, borderBottom: "1px solid #d4af3708" }}>
                  {parts.map((part, idx) => {
                    if (part.startsWith("**") && part.endsWith("**")) {
                      return <span key={idx} style={{ fontWeight: 700, color: "#d4af37" }}>{part.slice(2, -2)}</span>;  // ✅ Bold + Gold color
                    }
                    return <span key={idx}>{part}</span>;
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {caveConfirm && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000,
        }}>
          <div style={{ ...S.panel, maxWidth: 440, width: "90%", textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}><CaveSVG size={64} /></div>
            <h2 style={{ ...S.gold, margin: "0 0 8px 0", fontSize: 24 }}>A Dark Cave</h2>
            <div style={{ fontSize: 17, opacity: 0.7, marginBottom: 6 }}>
              You discover a cave entrance. From within, you sense a powerful presence...
            </div>
            <div style={{ fontSize: 19, fontWeight: 700, color: "#ef4444", marginBottom: 4 }}>
              {caveConfirm.bossEmoji} {caveConfirm.bossName}
            </div>
            <div style={{ fontSize: 15, opacity: 0.5, marginBottom: 12 }}>
              {caveConfirm.biome} • {caveConfirm.difficulty} difficulty
            </div>
            
            {/* ✅ Quest-Warnung: Prüfe ob Quest für diese Höhle existiert */}
            <CaveQuestBanner quests={quests} caveConfirm={caveConfirm} getQuestProgress={getQuestProgress} />
            
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => {
                const cave = caveConfirm;
                setCaveConfirm(null);
                const en = {
                  name: cave.bossName, sprite: cave.bossSprite,
                  level: cave.itemLevel,  // ✅ ADD: itemLevel für Display
                  hp: cave.bossHp, maxHp: cave.bossHp,
                  atk: cave.bossAtk,
                  dmg: cave.bossDmg,  // ✅ ADD: Boss Damage
                  def: cave.bossDef,  // ✅ ADD: Boss Defense
                  loot: [], isBoss: true,
                  xpReward: cave.bossXp, goldReward: cave.bossGold,
                  caveKey: `${cave.x},${cave.y}`, bossDifficulty: cave.difficulty,
                  bossBiome: cave.biome, lootSeed: cave.lootSeed,
                };
                
                // ✅ CRITICAL FIX: Clear all status/buffs from PREVIOUS combat before starting new combat!
                setPlayerStatus({ type: null, duration: 0, damagePerTurn: 0 });
                setEnemyStatus({ type: null, duration: 0, damagePerTurn: 0 });
                setPlayerBuffs({ active: [] });
                setEnemyBuffs({ active: [] });
                setSkillsOpen(false);
                setCombatItemsOpen(false);
                
                setEnemy(en);
                setEnemyHp(en.hp);
                setCombatLog([`👑 BOSS FIGHT! ${en.name} (Lv.${en.level}) emerges from the darkness!`]);
                setScreen("combat");
                addLog(`👑 Entered cave — fighting ${en.name} (Lv.${en.level})!`);
              }} style={{ ...S.btn, ...S.btnDanger, padding: "10px 24px", fontSize: 19 }}>
                ⚔️ Enter Cave
              </button>
              <button onClick={() => setCaveConfirm(null)} style={{ ...S.btn, padding: "10px 24px", fontSize: 19 }}>
                🚶 Walk Away
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PlayerHeader({ playerName, level, xp, xpToLevel, gold, hp, mana, stats }) {
  return (
    <div style={{ ...S.panel, marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: 21 }}>{playerName}</span>
          <span style={{ fontSize: 21, opacity: 0.6, marginLeft: 8 }}>Lv.{level}</span>
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 17 }}>
          <span style={{...S.gold, display:"flex", alignItems:"center", gap:4}}><MerchantSVG size={16}/> {gold}</span>
          <span style={{ opacity: 0.6 }}>⚔️ {stats.damage}</span>
          <span style={{ opacity: 0.6 }}>🛡️ {stats.defense}</span>
        </div>
      </div>
      <HealthBar current={hp} max={stats.maxHp} label="HP" />
      <HealthBar current={mana} max={stats.maxMana} label="Mana" isMana />
      <div style={{ height: 8, background: "#1a1a00", borderRadius: 4, overflow: "hidden", marginTop: 5, border: "1px solid #d4af3733" }}>
        <div style={{ width: `${(xp / xpToLevel) * 100}%`, height: "100%", background: "#d4af37", transition: "width 0.3s", borderRadius: 4 }} />
      </div>
      <div style={{ fontSize: 13, opacity: 0.4, textAlign: "right", marginTop: 2 }}>XP: {xp}/{xpToLevel}</div>
    </div>
  );
}

// ============================================================
// APP ROOT
// ============================================================

// ============================================================
// SAVE / LOAD
// ============================================================

const SAVE_KEY = "realm_of_shadows_save";
const SAVE_SLOTS = 3;  // ✅ Allow 3 save slots (slot 0, 1, 2)

function getSaveSlotKey(slotIndex = 0) {
  return `${SAVE_KEY}_slot_${slotIndex}`;
}

function saveGame(state, slotIndex = 0) {
  try {
    if (typeof localStorage === "undefined") return false;
    const data = JSON.stringify({
      ...state,
      completedQuestIds: [...state.completedQuestIds],
      visitedCities: state.visitedCities || [],  // ✅ Save as array
      timestamp: new Date().toISOString(),  // ✅ Add save timestamp
    });
    localStorage.setItem(getSaveSlotKey(slotIndex), data);
    return true;
  } catch (e) { return false; }
}

function loadGame(slotIndex = 0) {
  try {
    if (typeof localStorage === "undefined") return null;
    
    // ✅ NEW: Try new slot system first
    let raw = localStorage.getItem(getSaveSlotKey(slotIndex));
    
    // ✅ BACKWARDS COMPAT: If slot 0 is empty, try old SAVE_KEY (v0.18)
    if (!raw && slotIndex === 0) {
      raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        // Automatically migrate old save to slot 0
        console.log("Migrating old save to slot 0...");
        const data = JSON.parse(raw);
        data.completedQuestIds = new Set(data.completedQuestIds || []);
        data.visitedCities = new Set(data.visitedCities || []);
        saveGame(data, 0);  // Save to slot 0
        localStorage.removeItem(SAVE_KEY);  // Remove old key
        return data;
      }
    }
    
    if (!raw) return null;
    const data = JSON.parse(raw);
    data.completedQuestIds = new Set(data.completedQuestIds || []);
    data.visitedCities = new Set(data.visitedCities || []);  // ✅ Convert back to Set
    return data;
  } catch (e) { return null; }
}

function getAllSaves() {
  const saves = [];
  
  // ✅ NEW: Load new slot system
  for (let i = 0; i < SAVE_SLOTS; i++) {
    const data = loadGame(i);
    if (data) {
      saves.push({ slotIndex: i, data });
    }
  }
  
  // ✅ BACKWARDS COMPAT: Check if old SAVE_KEY exists (and not already migrated)
  try {
    if (typeof localStorage !== "undefined") {
      const oldRaw = localStorage.getItem(SAVE_KEY);
      if (oldRaw && !localStorage.getItem(getSaveSlotKey(0))) {
        // Old save exists and slot 0 is empty - it will be migrated on load
        const oldData = JSON.parse(oldRaw);
        oldData.completedQuestIds = new Set(oldData.completedQuestIds || []);
        oldData.visitedCities = new Set(oldData.visitedCities || []);
        saves.unshift({ slotIndex: 0, data: oldData, isOldSave: true });  // Mark as old save
      }
    }
  } catch (e) {}
  
  return saves;
}

function deleteSave(slotIndex = 0) {
  try { if (typeof localStorage !== "undefined") localStorage.removeItem(getSaveSlotKey(slotIndex)); } catch (e) {}
}

export default function RPGGame() {
  const [gameState, setGameState] = useState("menu");
  const [playerData, setPlayerData] = useState(null);
  const [allSaves, setAllSaves] = useState([]);  // ✅ Multiple saves
  const [selectedSlot, setSelectedSlot] = useState(null);  // ✅ Currently selected slot

  useEffect(() => {
    const saves = getAllSaves();  // ✅ Load all saves
    if (saves.length > 0) {
      setAllSaves(saves);
    } else {
      setGameState("creation");
    }
  }, []);

  if (gameState === "menu" && allSaves.length > 0) {
    return (
      <>
        <GlobalStyles />
        <div style={S.app}>
          <div style={{ maxWidth: 600, width: "100%" }}>
            <div style={S.panel}>
              <h1 style={{ ...S.gold, fontSize: 32, textAlign: "center", margin: "0 0 8px 0" }}>⚔️ Realm of Shadows</h1>
              <div style={{ textAlign: "center", marginBottom: 20, opacity: 0.6, fontSize: 16 }}>Select a save slot or create new character</div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
                {/* ✅ Show all save slots */}
                {Array.from({ length: SAVE_SLOTS }).map((_, slotIndex) => {
                  const save = allSaves.find(s => s.slotIndex === slotIndex);
                  return (
                    <div key={slotIndex} style={{ background: "#ffffff06", borderRadius: 8, padding: 14, border: `1px solid ${save ? "#d4af3722" : "#666622"}` }}>
                      <div style={{ fontSize: 16, fontWeight: 700, ...S.gold, marginBottom: 6 }}>
                        📁 Slot {slotIndex + 1} {save ? "" : "(empty)"}
                      </div>
                      {save && (
                        <div style={{ display: "flex", gap: 16, fontSize: 14, opacity: 0.8, flexWrap: "wrap", marginBottom: 8 }}>
                          <span>⚔️ {save.data.playerName}</span>
                          <span>Level {save.data.level}</span>
                          <span style={{display:"flex",alignItems:"center",gap:4}}><MerchantSVG size={14}/> {save.data.gold}g</span>
                          <span>📍 ({save.data.pos?.x}, {save.data.pos?.y})</span>
                          <span style={{ opacity: 0.6, fontSize: 12 }}>🕐 {new Date(save.data.timestamp).toLocaleDateString()}</span>
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 8 }}>
                        {save && (
                          <>
                            <button onClick={() => {
                              setPlayerData({ ...save.data, selectedSlot: slotIndex });
                              setGameState("playing");
                            }} style={{ ...S.btn, ...S.btnSuccess, flex: 1, fontSize: 14, padding: 10 }}>
                              ▶️ Load
                            </button>
                            <button onClick={() => {
                              deleteSave(slotIndex);
                              setAllSaves(saves => saves.filter(s => s.slotIndex !== slotIndex));
                            }} style={{ ...S.btn, ...S.btnDanger, fontSize: 14, padding: 10 }}>
                              🗑️ Delete
                            </button>
                          </>
                        )}
                        {!save && (
                          <button onClick={() => {
                            setSelectedSlot(slotIndex);
                            setGameState("creation");
                          }} style={{ ...S.btn, ...S.btnSuccess, flex: 1, fontSize: 14, padding: 10 }}>
                            ➕ New Character
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (gameState === "creation") {
    return (
      <>
        <GlobalStyles />
        <CharacterCreation
          onStart={(name, attrs) => {
            setPlayerData({ name, attrs, isNew: true, selectedSlot: selectedSlot ?? 0 });
            setGameState("playing");
          }}
        />
      </>
    );
  }

  if (gameState === "playing" && playerData) {
    return <><GlobalStyles /><Game playerData={playerData} onMainMenu={() => { setGameState("menu"); setPlayerData(null); }} onSaveSlotUpdate={(slot) => {}} /></>;
  }

  // Loading state (waiting for useEffect to check localStorage)
  return (
    <>
      <GlobalStyles />
      <div style={S.app}>
        <div style={{ ...S.gold, fontSize: 24 }}>⚔️ Loading...</div>
      </div>
    </>
  );
}
