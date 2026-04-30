import { detectProvider, callAI } from './src/lib/ai/provider';
console.log('Provider:', detectProvider({ feature: 'chat' }));
callAI([{role: 'user', content: 'test'}], { feature: 'chat' }).then(console.log).catch(console.error);
