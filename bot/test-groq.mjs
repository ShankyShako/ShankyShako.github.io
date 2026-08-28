#!/usr/bin/env node
/**
 * Test script to verify Groq API access
 * Run: node bot/test-groq.mjs
 */

import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

/* Load .env file */
if (existsSync(join(here, '.env'))) {
  process.loadEnvFile(join(here, '.env'));
}

const GROQ_API_KEY = process.env.GROQ_API_KEY ?? '';

console.log('\n=== Groq API Test ===\n');

if (!GROQ_API_KEY) {
  console.error('❌ GROQ_API_KEY is not set in bot/.env');
  console.log('\nTo fix:');
  console.log('1. Visit https://console.groq.com/keys');
  console.log('2. Create an API key');
  console.log('3. Add it to bot/.env: GROQ_API_KEY=gsk_...');
  process.exit(1);
}

console.log('✓ API key found:', GROQ_API_KEY.slice(0, 10) + '...' + GROQ_API_KEY.slice(-4));

const models = [
  // Common models that should be available
  'mixtral-8x7b-32768',
  'gemma2-9b-it',
  'gemma-7b-it',
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile',
  'llama3-8b-8192',
  'llama3-70b-8192',
  // Preview/Qwen models
  'qwen/qwen3.6-27b',
  'qwen/qwen3.8-27b',
  // Mistral variants
  'mistral-7b-instruct',
  'mistral-8x7b-instruct-v0.1',
];

console.log('\nTesting models...\n');

for (const model of models) {
  try {
    console.log(`Testing: ${model}`);
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (res.ok) {
      const data = await res.json();
      console.log(`✅ ${model} - WORKS`);
      console.log(`   Response: ${data.choices?.[0]?.message?.content}\n`);
    } else {
      const error = await res.text();
      console.log(`❌ ${model} - ${res.status}`);
      console.log(`   Error: ${error.slice(0, 200)}\n`);
    }
  } catch (err) {
    console.log(`❌ ${model} - Failed`);
    console.log(`   ${err.message}\n`);
  }
}

console.log('=== Test Complete ===\n');
