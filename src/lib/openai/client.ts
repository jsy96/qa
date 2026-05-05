import OpenAI from 'openai';

export function createClient(): OpenAI {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    throw new Error('LLM_API_KEY environment variable is not set');
  }
  return new OpenAI({
    apiKey,
    baseURL: process.env.LLM_BASE_URL || 'https://token-plan-cn.xiaomimimo.com/v1',
  });
}

export const MODEL = process.env.LLM_MODEL || 'mimo-v2.5-pro';
