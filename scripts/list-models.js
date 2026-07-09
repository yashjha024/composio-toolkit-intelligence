import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

async function listModels() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.list();
  for await (const m of response) {
    if (m.supportedActions?.includes('generateContent') || m.supportedGenerationMethods?.includes('generateContent')) {
      console.log(m.name);
    }
  }
}

listModels().catch(console.error);
