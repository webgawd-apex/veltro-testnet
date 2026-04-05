import bs58 from 'bs58';
import { Keypair } from '@solana/web3.js';

/**
 * 🎲 HateCasino - House Key Converter
 * Use this to convert your existing Phantom Private Key (Base58) 
 * into the JSON Array format needed for Render.com.
 * 
 * USAGE:
 * node scripts/convert-house-key.js <YOUR_BASE58_PRIVATE_KEY>
 */

const inputKey = process.argv[2];

if (!inputKey) {
    console.error("❌ ERROR: Please provide your Phantom private key as an argument.");
    console.log("Usage: node scripts/convert-house-key.js <YOUR_PRIVATE_KEY>");
    process.exit(1);
}

try {
    // 1. Decode the Base58 key
    const decoded = bs58.decode(inputKey);
    const secretKeyArray = Array.from(decoded);
    
    // 2. Verify it's a valid keypair
    const keypair = Keypair.fromSecretKey(new Uint8Array(secretKeyArray));
    
    console.log("\n==================================================");
    console.log("✅ CONVERSION SUCCESSFUL");
    console.log("==================================================\n");
    
    console.log("📍 HOUSE WALLET ADDRESS (Public Key):");
    console.log(keypair.publicKey.toString());
    console.log("\n--------------------------------------------------");
    
    console.log("🔑 HOUSE PRIVATE KEY (Secret Key Array):");
    console.log("COPY EVERYTHING INSIDE THE BRACKETS [] INTO RENDER.COM:");
    console.log(JSON.stringify(secretKeyArray));
    console.log("\n==================================================");
    console.log("⚠️ Keep this array safe! It gives full control over the wallet.");

} catch (err) {
    console.error("❌ ERROR: Failed to convert key. Please ensure it is a valid Base58 private key.");
    console.error("Details:", err.message);
}
