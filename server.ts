import express from "express";
import { createServer as createViteServer } from "vite";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import * as dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

app.post("/api/briefing", async (req, res) => {
  const { keywords, keyword_operators, maxArticles = 10, lang = "ko" } = req.body;

  if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
    return res.status(400).json({ error: "키워드가 없습니다" });
  }

  // KST date
  const kstDate = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split("T")[0];
  const config = { keywords, keyword_operators, max_articles: maxArticles, briefing_lang: lang, date: kstDate };
  const configPath = `/tmp/briefing_config_${Date.now()}.json`;
  fs.writeFileSync(configPath, JSON.stringify(config));

  const outputFile = path.join(process.cwd(), `briefing_${kstDate.replace(/-/g, "")}.md`);
  const title = keywords.join(" / ");

  try {
    await new Promise<void>((resolve, reject) => {
      const py = spawn("python", ["main.py", "--input", configPath], { cwd: process.cwd() });
      let stderr = "";
      py.stderr.on("data", (d) => (stderr += d.toString()));
      py.on("close", (code) => {
        fs.unlinkSync(configPath);
        code === 0 ? resolve() : reject(new Error(stderr || `exit code ${code}`));
      });
    });

    const md = fs.existsSync(outputFile) ? fs.readFileSync(outputFile, "utf-8") : "";
    res.json({ status: "success", markdown: md, date: kstDate, title });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

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
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
