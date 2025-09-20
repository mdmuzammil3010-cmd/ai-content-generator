import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import dotenv from "dotenv";
dotenv.config();

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function testNovaPro() {
  try {
    const prompt = "Write a short social media post about AI tools.";

    const command = new InvokeModelCommand({
      modelId: "amazon.nova-pro-v1:0",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: [prompt] // ✅ just an array of strings
          }
        ]
      }),
    });

    const response = await client.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.body));
    const aiText = result?.results?.[0]?.content?.[0] || "No response";

    console.log("✅ Nova Pro output:", aiText);
  } catch (err) {
    console.error("❌ Nova Pro failed:", err);
  }
}

testNovaPro();
