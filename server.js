import express from "express";
import path from "path";
import bodyParser from "body-parser";
import { fileURLToPath } from "url";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import dotenv from "dotenv";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(bodyParser.json({ limit: "50mb" }));
app.use(express.static(__dirname));

// 🟢 Bedrock Client (Nova Pro + Canvas)
const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// 🟢 Generate Text (Nova Pro)
app.post("/api/generate-text", async (req, res) => {
  try {
    const { topic } = req.body;
    const prompt = `Write a short, engaging social media post about: ${topic}`;

    const command = new InvokeModelCommand({
      modelId: "amazon.nova-pro-v1:0",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        // ✅ Chat-based input format
        messages: [
          { role: "user", content: [{ text: prompt }] }
        ],
        inferenceConfig: {
          temperature: 0.7,
          maxTokens: 300,
          topP: 0.9
        }
      }),
    });

    const response = await client.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.body));

    // ✅ Nova returns an array of message outputs
    const aiText = result.output?.message?.content
      ?.map(c => c.text)
      .join(" ") || "No response";

    res.json({ text: aiText });
  } catch (err) {
    console.error("Nova Pro Error:", err);
    res.status(500).json({ error: "Nova Pro text generation failed", details: err.message });
  }
});

// 🟢 Generate Image (Nova Canvas)
app.post("/api/generate-image", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    // Add "Generate an image of" to help Nova Canvas understand
    const fullPrompt = `Generate an image of: ${prompt}`;

    const command = new InvokeModelCommand({
      modelId: "amazon.nova-canvas-v1:0",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: [{ text: fullPrompt }]
          }
        ]
      }),
    });

    const response = await client.send(command);
    const raw = new TextDecoder().decode(response.body);
    console.log("Nova Canvas raw response:", raw);

    const result = JSON.parse(raw);

    // Check for images in the model's response
    if (!result.images || !result.images.length) {
      throw new Error("No image returned from Nova Canvas. Try a more descriptive prompt.");
    }

    const imageBase64 = result.images[0];
    res.json({ image: imageBase64 });

  } catch (err) {
    console.error("Nova Canvas Error:", err);
    res.status(500).json({
      error: "Nova Canvas image generation failed",
      details: err.message
    });
  }
});


// 🟢 Demo video (placeholder)
app.post("/api/generate-video", async (req, res) => {
  res.json({
    video_url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  });
});

// 🟢 Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
