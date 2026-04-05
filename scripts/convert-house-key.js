import bs58 from 'bs58';
import { Keypair } from '@solana/web3.js';

/**
 * 🎲 HateCasino - House Key Converter
 * Use this to convert between Phantom Private Keys (Base58) 
 * and Render.com Private Keys (JSON Arrays).
 */

const input = process.argv[2];

if (!input) {
    console.log("\n❌ Please provide a key (Base58 string OR JSON array) as a terminal argument.");
    console.log("Usage: node scripts/convert-house-key.js <YOUR_KEY_HERE>\n");
    process.exit(1);
}

try {
    let secretKey;
    
    // Auto-detect format
    if (input.startsWith('[') || input.includes(',')) {
        // It's a JSON array string like "[122, 54, ...]"
        console.log("🔎 Detected format: JSON Array");
        secretKey = new Uint8Array(JSON.parse(input));
    } else {
        // It's likely a Base58 string like "4zH8..."
        console.log("🔎 Detected format: Base58 String");
        secretKey = bs58.decode(input);
    }

    const keypair = Keypair.fromSecretKey(secretKey);
    const base58Format = bs58.encode(secretKey);
    const arrayFormat = JSON.stringify(Array.from(secretKey));

    console.log("\n==================================================");
    console.log("✅ KEY CONVERTED SUCCESSFULLY");
    console.log("==================================================\n");
    
    console.log("📍 WALLET ADDRESS (Public Key):");
    console.log(keypair.publicKey.toString());
    
    console.log("\n👻 FOR PHANTOM WALLET (Base58 String):");
    console.log(base58Format);
    
    console.log("\n🚀 FOR RENDER.COM ENV VAR (JSON Array):");
    console.log(arrayFormat);
    
    console.log("\n==================================================");
    console.log("⚠️ Keep these secrets safe! Never share them publicly.");

} catch (err) {
    console.error("❌ ERROR: Failed to convert. Please check your key formatting.");
    console.error("Details:", err.message);
}
