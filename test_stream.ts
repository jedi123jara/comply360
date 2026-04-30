import { callAIStream } from './src/lib/ai/provider'; 
(async () => { 
  try { 
    const stream = callAIStream([{role: 'user', content: 'test'}], { feature: 'chat' }); 
    for await (const chunk of stream) { 
      console.log(chunk); 
    } 
  } catch (e) { 
    console.error('STREAM ERROR:', e) 
  } 
})();
