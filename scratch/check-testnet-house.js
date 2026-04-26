import { Keypair, Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import fs from 'fs';

async function checkHouse() {
  try {
    const envPath = "C:\\Users\\Acer\\Downloads\\VeltroTestnet\\.env";
    const envContent = fs.readFileSync(envPath, 'utf8');
    const env = {};
    envContent.split('\n').forEach(line => {
      const [key, ...val] = line.split('=');
      if (key) env[key.trim()] = val.join('=').trim();
    });

    const rpc = env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com";
    const connection = new Connection(rpc, "confirmed");
    
    console.log("--- TESTNET HOUSE WALLET DIAGNOSTIC ---");
    console.log("RPC:", rpc);
    
    const secretKey = new Uint8Array(JSON.parse(env.HOUSE_PRIVATE_KEY));
    const keypair = Keypair.fromSecretKey(secretKey);
    const pubkey = keypair.publicKey.toBase58();
    
    console.log("Public Key:", pubkey);
    
    const balance = await connection.getBalance(keypair.publicKey);
    console.log("Balance:", balance / LAMPORTS_PER_SOL, "SOL");

  } catch (err) {
    console.error("DIAGNOSTIC ERROR:", err.message);
  }
}

checkHouse();
