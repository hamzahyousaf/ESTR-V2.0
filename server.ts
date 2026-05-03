import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";
import FormData from "form-data";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Proxy for Telegram to avoid CORS and sandbox issues
  app.post("/api/telegram", async (req, res) => {
    try {
      const { token, chatId, message, parseMode, photo } = req.body;
      
      if (!token || !chatId) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      let telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`;
      let body: any = {
        chat_id: chatId,
        text: message,
        parse_mode: parseMode || "Markdown"
      };

      if (photo) {
        telegramUrl = `https://api.telegram.org/bot${token}/sendPhoto`;
        // Handle base64 photo
        const base64Data = photo.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        
        const formData = new FormData();
        formData.append('chat_id', chatId);
        formData.append('caption', message);
        formData.append('parse_mode', parseMode || "Markdown");
        formData.append('photo', buffer, { filename: 'chart.png', contentType: 'image/png' });

        const response = await fetch(telegramUrl, {
          method: "POST",
          body: formData
        });
        const data = await response.json();
        return res.status(response.status).json(data);
      }

      const response = await fetch(telegramUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error) {
      console.error("Telegram Proxy Error:", error);
      res.status(500).json({ error: "Internal Server Error", detail: String(error) });
    }
  });

  // Proxy for Binance API in case of CORS or connectivity issues in iframe
  app.get("/api/binance/*", async (req, res) => {
    try {
      const apiPath = req.params[0];
      const queryParams = new URLSearchParams(req.query as any).toString();
      const binanceUrl = `https://fapi.binance.com/${apiPath}${queryParams ? `?${queryParams}` : ""}`;
      
      const response = await fetch(binanceUrl);
      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error) {
      console.error("Binance Proxy Error:", error);
      res.status(500).json({ error: "Internal Server Error" });
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
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
