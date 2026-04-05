import { Keypair } from '@solana/web3.js';
import { writeFileSync } from 'fs';

/**
 * 🎰 HateCasino - House Key Generator
 * Use this script to create a fresh Solana wallet for your House.
 * This will give you the Public Key (Wallet Address) and the 
 * Secret Key Array (for Render.com environment variables).
 */

function generate() {
    const keypair = Keypair.generate();
    
    const publicKey = keypair.publicKey.toString();
    const secretKeyArray = Array.from(keypair.secretKey);
    const secretKeyJson = JSON.stringify(secretKeyArray);

    console.log("\n==================================================");
    console.log("🚀 NEW HOUSE KEY GENERATED");
    console.log("==================================================\n");
    
    console.log("📍 HOUSE WALLET ADDRESS (Public Key):");
    console.log(publicKey);
    console.log("\n--------------------------------------------------");
    
    console.log("🔑 HOUSE PRIVATE KEY (Secret Key Array):");
    console.log("COPY THE ENTIRE LINE BELOW INTO RENDER.COM ENV VAR:");
    console.log(secretKeyJson);
    console.log("\n==================================================");

    // Save to a local file just in case
    const backupData = {
        publicKey: publicKey,
        secretKey: secretKeyArray
    };
    
    try {
        writeFileSync('house-key.json', JSON.stringify(backupData, null, 2));
        console.log("✅ Backup saved to: house-key.json");
        console.log("⚠️ DO NOT COMMIT house-key.json TO GITHUB!");
    } catch (err) {
        console.error("❌ Failed to save backup file:", err.message);
    }
}

generate();
