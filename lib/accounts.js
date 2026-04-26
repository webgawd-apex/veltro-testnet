import { query } from './db.js';

const mapUser = (user) => ({
  ...user,
  processedSignatures: user.processed_signatures,
  createdAt: user.created_at,
  updatedAt: user.updated_at
});

export const getOrCreateAccount = async (wallet) => {
  const cleanWallet = wallet.trim();
  console.log(`[ACCOUNTS] getOrCreateAccount for: ${cleanWallet}`);
  try {
    let res = await query('SELECT * FROM users WHERE wallet = $1', [cleanWallet]);
    console.log(`[ACCOUNTS] Find result count: ${res.rows.length}`);
    
    if (res.rows.length === 0) {
      console.log(`[ACCOUNTS] Creating new user for ${cleanWallet}`);
      await query('INSERT INTO users (wallet, balance) VALUES ($1, 0) ON CONFLICT (wallet) DO NOTHING', [cleanWallet]);
      res = await query('SELECT * FROM users WHERE wallet = $1', [cleanWallet]);
    }

    const user = res.rows[0];
    const historyRes = await query(
      'SELECT game, multiplier, profit, amount, timestamp FROM bets WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 20',
      [user.id]
    );
    
    const mapped = { ...mapUser(user), history: historyRes.rows };
    console.log(`[ACCOUNTS] Returning account for ${cleanWallet}. balance: ${mapped.balance}`);
    return mapped;
  } catch (err) {
    console.error("[ACCOUNTS] getOrCreateAccount error:", err.message);
    return null;
  }
};

export const getAccount = async (wallet) => {
  const cleanWallet = wallet.trim();
  try {
    const res = await query('SELECT * FROM users WHERE wallet = $1', [cleanWallet]);
    if (res.rows.length === 0) {
      console.log(`[ACCOUNTS] getAccount: No user found for ${cleanWallet}`);
      return null;
    }
    
    const user = res.rows[0];
    const historyRes = await query(
      'SELECT game, multiplier, profit, amount, timestamp FROM bets WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 20',
      [user.id]
    );
    
    return { ...mapUser(user), history: historyRes.rows };
  } catch (err) {
    console.error("[ACCOUNTS] getAccount error:", err.message);
    return null;
  }
};

export const creditBalance = async (wallet, amount, signature = null) => {
  const cleanWallet = wallet.trim();
  console.log(`[ACCOUNTS] creditBalance start. wallet: ${cleanWallet}, amount: ${amount}`);
  try {
    const user = await getOrCreateAccount(cleanWallet);
    if (!user) {
      console.error("[ACCOUNTS] Credit failed: User could not be created/fetched");
      return null;
    }

    if (signature && user.processedSignatures?.includes(signature)) {
      console.log(`[ACCOUNTS] Duplicate signature detected: ${signature}`);
      return user;
    }

    const updatedRes = await query(
      `UPDATE users 
       SET balance = balance + $1, 
           processed_signatures = CASE WHEN $2::text IS NOT NULL THEN array_append(processed_signatures, $2) ELSE processed_signatures END,
           updated_at = NOW()
       WHERE wallet = $3 
       RETURNING *`,
      [amount, signature, cleanWallet]
    );

    if (updatedRes.rows.length === 0) {
      console.error("[ACCOUNTS] UPDATE returned 0 rows! This should not happen.");
      return null;
    }

    const updatedUser = updatedRes.rows[0];
    console.log(`[ACCOUNTS] UPDATE successful. New balance: ${updatedUser.balance}`);

    const historyRes = await query(
      'SELECT game, multiplier, profit, amount, timestamp FROM bets WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 20',
      [updatedUser.id]
    );

    return { ...mapUser(updatedUser), history: historyRes.rows };
  } catch (err) {
    console.error("[ACCOUNTS] creditBalance failed:", err.message);
    return null;
  }
};

export const debitBalance = async (wallet, amount) => {
  const cleanWallet = wallet.trim();
  try {
    const user = await getAccount(cleanWallet);
    if (!user || user.balance < amount - 0.000001) return null;

    const updatedRes = await query(
      'UPDATE users SET balance = balance - $1, updated_at = NOW() WHERE wallet = $2 RETURNING *',
      [amount, cleanWallet]
    );

    const updatedUser = updatedRes.rows[0];
    const historyRes = await query(
      'SELECT game, multiplier, profit, amount, timestamp FROM bets WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 20',
      [updatedUser.id]
    );

    return { ...mapUser(updatedUser), history: historyRes.rows };
  } catch (err) {
    console.error("[ACCOUNTS] debitBalance failed:", err.message);
    return null;
  }
};

export const hasBalance = async (wallet, amount) => {
  const cleanWallet = wallet.trim();
  try {
    const res = await query('SELECT balance FROM users WHERE wallet = $1', [cleanWallet]);
    if (res.rows.length === 0) return false;
    return res.rows[0].balance >= amount - 0.000001;
  } catch (err) {
    return false;
  }
};

export const addBetHistory = async (wallet, entry) => {
  const cleanWallet = wallet.trim();
  try {
    const userRes = await query('SELECT id FROM users WHERE wallet = $1', [cleanWallet]);
    if (userRes.rows.length === 0) return;

    await query(
      'INSERT INTO bets (user_id, game, multiplier, profit, amount) VALUES ($1, $2, $3, $4, $5)',
      [userRes.rows[0].id, entry.game, entry.multiplier, entry.profit, entry.amount]
    );
  } catch (err) {
    console.error("[ACCOUNTS] addBetHistory failed:", err.message);
  }
};
