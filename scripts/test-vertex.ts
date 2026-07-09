import 'dotenv/config';
import { GeminiLlmProvider } from '../src/providers/llm/gemini.js';

async function runStandaloneTest() {
  console.log('--- STARTING STANDALONE VERTEX AI TEST ---');
  const provider = new GeminiLlmProvider('gemini-2.5-flash');
  
  const prompt = 'Reply with exactly: VERTEX_OK';
  const model = 'gemini-2.5-flash';
  const route = 'vertex-ai';
  const projectId = 'gen-lang-client-0153019470';
  const location = 'global';

  try {
    // Pass generous maxOutputTokens to ensure complete generation
    const response = await provider.generateText(prompt, undefined, { maxOutputTokens: 100 });
    console.log('--- VERTEX AI TEST REPORT ---');
    console.log(`1. Authentication success or failure: SUCCESS`);
    console.log(`2. Exact response: ${response.trim()}`);
    console.log(`3. Provider route: ${route}`);
    console.log(`4. Project ID: ${projectId}`);
    console.log(`5. Location: ${location}`);
    console.log(`6. Model: ${model}`);
    console.log(`7. Exact error code/message if it fails: N/A`);
  } catch (err: any) {
    console.log('--- VERTEX AI TEST REPORT ---');
    console.log(`1. Authentication success or failure: FAILURE`);
    console.log(`2. Exact response: N/A`);
    console.log(`3. Provider route: ${route}`);
    console.log(`4. Project ID: ${projectId}`);
    console.log(`5. Location: ${location}`);
    console.log(`6. Model: ${model}`);
    console.log(`7. Exact error code/message if it fails: ${err?.code || err?.status || ''} - ${err?.message || err}`);
  }
}

runStandaloneTest();
