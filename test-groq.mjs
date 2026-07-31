// using native fetch
import fs from 'fs';
import path from 'path';

// Read .env.local
const env = fs.readFileSync('.env.local', 'utf-8');
const apiKey = env.split('\n').find(l => l.startsWith('GROQ_API_KEY=')).split('=')[1].trim();

async function testModel(modelName) {
  console.log('Testing', modelName);
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelName,
      messages: [{ 
        role: 'user', 
        content: 'Say hello' 
      }],
      temperature: 0.2,
      max_tokens: 100,
    }),
  });
  
  if (!res.ok) {
    console.error(modelName, 'Error:', await res.text());
  } else {
    const data = await res.json();
    console.log(modelName, 'Success!', data.choices[0].message.content.substring(0, 50));
  }
}

async function run() {
  await testModel('llama-3.3-70b-versatile');
}
run();
