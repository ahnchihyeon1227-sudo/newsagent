import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import * as dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// API Routes
app.post("/api/news", async (req, res) => {
  const { keywords, maxArticles = 10 } = req.body;

  if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
    return res.status(400).json({ error: "Keywords are required" });
  }

  const newsApiKey = process.env.NEWS_API_KEY;
  
  try {
    let articles: any[] = [];

    if (newsApiKey) {
      const query = keywords.join(" OR ");
      const newsResponse = await fetch(
        `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&pageSize=${maxArticles}&apiKey=${newsApiKey}&language=en&sortBy=publishedAt`
      );
      
      if (newsResponse.ok) {
        const newsData = await newsResponse.json();
        articles = newsData.articles || [];
      } else {
        console.warn("NewsAPI failed or returned error");
      }
    }

    res.json({
      status: "success",
      articles: articles.map((art: any) => ({
        title: art.title,
        source: art.source.name,
        url: art.url,
        description: art.description || art.content,
        publishedAt: art.publishedAt
      })),
      hasApiKey: !!newsApiKey
    });

  } catch (error: any) {
    console.error("News Fetch Error:", error);
    res.status(500).json({ error: error.message });
  }
});


// Vite Middleware
async function startServer() {
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
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
