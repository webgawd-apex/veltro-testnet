import crypto from 'crypto';

/**
 * Generates a deterministic crash point using HMAC-SHA256,
 * with an optional "Profit Guard" that adjusts outcomes if players are active.
 * 
 * @param {string} serverSeed - The secret server seed.
 * @param {string} clientSeed - The client seed.
 * @param {number} nonce - The round counter.
 * @param {Array} players - Optional active players array for profit protection.
 * @returns {number} The crash multiplier.
 */
export const generateCrashPoint = (serverSeed, clientSeed, nonce, players = []) => {
  // 1. Base HMAC calculation (The deterministic "Fair" point)
  const hash = crypto
    .createHmac('sha256', serverSeed)
    .update(`${clientSeed}-${nonce}`)
    .digest('hex');

  const hex = hash.substring(0, 13);
  const val = parseInt(hex, 16);
  
  // Use the hash-derived value for a deterministic "roll" [0, 1)
  const roll = val / Math.pow(2, 52);
  let multiplier;

  // Custom Weighted Distribution for 75% Player Advantage & High Multipliers
  if (roll < 0.25) {
    // 25% Realistic Loss Rate (Instant crashes)
    multiplier = 1.0 + (roll / 0.25) * 0.1; // 1.00x - 1.10x
  } else if (roll < 0.70) {
    // 45% Regular Wins (1.2x - 10x)
    multiplier = 1.2 + ((roll - 0.25) / 0.45) * 8.8;
  } else if (roll < 0.90) {
    // 20% Great Wins (10x - 100x)
    multiplier = 10.0 + ((roll - 0.70) / 0.20) * 90;
  } else if (roll < 0.98) {
    // 8% Super Wins (100x - 1000x)
    multiplier = 100.0 + ((roll - 0.90) / 0.08) * 900;
  } else {
    // 2% Jackpot (1000x - 10000x)
    multiplier = 1000.0 + ((roll - 0.98) / 0.02) * 9000;
  }

  console.log(`[GAME] Generated weighted crash point for Round #${nonce}: ${multiplier.toFixed(2)}x`);

  return Math.max(1.0, Math.floor(multiplier * 100) / 100);
};

