import express from "express";
import path from "path";
import fs from "fs";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import axios from "axios";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(bodyParser.json({ limit: "50mb" }));
app.use(express.static(__dirname));

// Ping
app.get("/api/ping", (req, res) => res.sendStatus(200));

// Helper function to format AI text with bullet points and hashtags
function formatContent(rawText, keywords) {
  const sentences = rawText.split(/\. |\n/).filter(s => s.trim() !== "");
  const bullets = sentences.map(s => `- ${s.trim().replace(/\.$/, "")}.`).join("\n");

  let tags = "";
  if (keywords) {
    const words = keywords.split(",").map(k => k.trim().replace(/\s+/g, ""));
    tags = "\n\n" + words.map(w => `#${w}`).join(" ");
  }

  return `**Your Post**\n\n${bullets}${tags}`;
}

// Generate text (local GPT4All if running locally, Groq if online)
app.post("/api/generate-text", async (req, res) => {
  try {
    const { topic, tone, platform, length, keywords } = req.body;
    const prompt = `(${platform || "Any platform"}) ${tone ? tone + ":" : ""} 
      Write a ${length || "short"} social media post about ${topic || "your topic"}.
      ${keywords ? " Keywords: " + keywords : ""}

      Please format the post as follows:
      - Include a heading at the top
      - Use bullet points for key ideas
      - Add 3-5 relevant hashtags at the bottom`;

    let aiText = "";

    if (process.env.GROQ_API_KEY) {
      // 🟢 Online mode with Groq API
      const response = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: "llama3-8b-8192",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 300,
          temperature: 0.7
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            "Content-Type": "application/json"
          }
        }
      );
      aiText = response.data.choices?.[0]?.message?.content || "No response";
    } else {
      // 🟡 Offline mode with GPT4All Local API
      const modelsResp = await fetch("http://127.0.0.1:4891/v1/models");
      const modelsData = await modelsResp.json();
      const availableModels = modelsData.data || [];
      if (availableModels.length === 0) {
        return res.status(500).json({ error: "No models available on GPT4All local API" });
      }
      const modelName = availableModels[0].id;

      const response = await fetch("http://127.0.0.1:4891/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: modelName,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 300,
          temperature: 0.7
        })
      });

      const textData = await response.text();
      let data;
      try {
        data = JSON.parse(textData);
        aiText = data.choices?.[0]?.message?.content || "No response";
      } catch (e) {
        console.error("Failed to parse JSON:", e, textData);
        return res.status(500).json({ error: "Invalid JSON from GPT4All", raw: textData });
      }
    }

    const formattedText = formatContent(aiText, keywords);
    res.json({ text: formattedText });

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "AI generation failed", details: err.message });
  }
});

// Generate image (demo)
app.post("/api/generate-image", async (req, res) => {
  const demoPath = path.join(__dirname, "assets", "demo.jpg");
  if (fs.existsSync(demoPath)) {
    const b64 = fs.readFileSync(demoPath, { encoding: "base64" });
    return res.json({ image_base64: b64 });
  }
  return res.status(500).send("Demo image not found. Create assets/demo.png");
});

// Generate video (demo)
app.post("/api/generate-video", async (req, res) => {
  const demoPath = path.join(__dirname, "assets", "demo.mp4");
  if (fs.existsSync(demoPath)) {
    const b64 = fs.readFileSync(demoPath, { encoding: "base64" });
    return res.json({ video_base64: b64 });
  }
  return res.json({
    video_url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 Server running on", PORT));
