import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import crypto from "crypto";
import fetch from "node-fetch";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Binance Order Proxy
  app.post("/api/trade/binance", async (req, res) => {
    try {
      const { apiKey, apiSecret, symbol, side, type, quantity, price, stopPrice, takeProfitPrice, isFutures } = req.body;

      if (!apiKey || !apiSecret) {
        return res.status(400).json({ error: "Missing API credentials" });
      }

      const baseUrl = isFutures ? "https://fapi.binance.com" : "https://api.binance.com";
      const endpoint = isFutures ? "/fapi/v1/order" : "/api/v3/order";
      
      const timestamp = Date.now();
      let query = `symbol=${symbol}&side=${side}&type=${type}&quantity=${quantity}&timestamp=${timestamp}`;
      
      if (price) query += `&price=${price}&timeInForce=GTC`;
      if (stopPrice) query += `&stopPrice=${stopPrice}`;

      const signature = crypto
        .createHmac("sha256", apiSecret)
        .update(query)
        .digest("hex");

      const url = `${baseUrl}${endpoint}?${query}&signature=${signature}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "X-MBX-APIKEY": apiKey,
        },
      });

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API Route: Bybit Order Proxy
  app.post("/api/trade/bybit", async (req, res) => {
    try {
      const { apiKey, apiSecret, symbol, side, type, qty, price, sl, tp } = req.body;

      const timestamp = Date.now().toString();
      const recvWindow = "5000";
      
      const params = {
          category: "linear",
          symbol,
          side,
          orderType: type,
          qty: qty.toString(),
          price: price?.toString(),
          stopLoss: sl?.toString(),
          takeProfit: tp?.toString(),
          timeInForce: "GTC"
      };

      const rawData = JSON.stringify(params);
      const signData = timestamp + apiKey + recvWindow + rawData;
      
      const signature = crypto
        .createHmac("sha256", apiSecret)
        .update(signData)
        .digest("hex");

      const response = await fetch("https://api.bybit.com/v5/order/create", {
        method: "POST",
        headers: {
          "X-BAPI-API-KEY": apiKey,
          "X-BAPI-SIGN": signature,
          "X-BAPI-TIMESTAMP": timestamp,
          "X-BAPI-RECV-WINDOW": recvWindow,
          "Content-Type": "application/json",
        },
        body: rawData,
      });

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
