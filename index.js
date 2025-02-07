require('dotenv').config();
const axios = require('axios');

const config = {
 agentUrl: process.env.AGENT_URL,
 authHeader: process.env.AUTH_HEADER,
 interval: parseInt(process.env.POST_INTERVAL || '14400000'),
};

console.log('Environment check:');
console.log('Agent URL configured:', !!config.agentUrl);
console.log('Auth Header configured:', !!config.authHeader);
console.log('Interval configured:', config.interval);

const currentDate = new Date();
const dateString = currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

const prompts = [
 `It's ${dateString} - if this is the birthday of any influential deceased musicians, share a tribute tweet about their legacy`,
 "share a hot take about a music genre",
 "share a hot take about a music artist",
 "recommend a song and share its YouTube link - tell us why it matters",
 "share an underrated track with its YouTube link - what makes it special?",
  "pick an essential song, drop the YouTube link, and tell us its impact",
 "share your thoughts about a topic regarding music",
 "share a music history fact",
 "Share album anniversary celebrations of famous albums",
 "which classic album deserves another listen?",
 "what song changed your view of music lately?",
];

function isValidMusicContent(response) {
 const cryptoTerms = ['crypto', 'etf', 'market', 'bitcoin', 'solana', 'xrp', 'yield', 'investment', 'trading', 'price'];
 const musicTerms = ['music', 'song', 'artist', 'band', 'album', 'genre', 'track', 'sound'];
 
 return !cryptoTerms.some(term => response.toLowerCase().includes(term)) &&
        musicTerms.some(term => response.toLowerCase().includes(term));
}

async function sendTweet() {
 try {
   const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
   console.log(`Attempting to send tweet with prompt: ${randomPrompt}`);
   
   const response = await axios.post(config.agentUrl, {
     user: "Synthereum",
     text: randomPrompt,
     action: "Post"
   }, {
     headers: {
       'Authorization': config.authHeader,
       'Content-Type': 'application/json'
     }
   });

   if (response.data && response.data.text) {
     if (!isValidMusicContent(response.data.text)) {
       console.log('Non-music content detected, retrying...');
       return false;
     }
   }

   console.log('Tweet request successful:', response.status);
   return true;
 } catch (error) {
   console.error('Error sending tweet:', error.message);
   if (error.response) {
     console.error('Response data:', error.response.data);
     console.error('Response status:', error.response.status);
   }
   return false;
 }
}

async function sendTweetWithRetry(maxRetries = 3, delay = 5000) {
 for (let i = 0; i < maxRetries; i++) {
   const success = await sendTweet();
   if (success) return true;
   
   console.log(`Attempt ${i + 1} failed. ${i < maxRetries - 1 ? 'Retrying in ' + delay/1000 + ' seconds...' : 'No more retries.'}`);
   if (i < maxRetries - 1) {
     await new Promise(resolve => setTimeout(resolve, delay));
   }
 }
 return false;
}

async function start() {
 console.log('Starting tweet automation...');
 console.log(`Tweet interval set to ${config.interval/1000} seconds`);
 
 await sendTweetWithRetry();
 
 setInterval(async () => {
   await sendTweetWithRetry();
 }, config.interval);
}

process.on('uncaughtException', (error) => {
 console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
 console.error('Unhandled Rejection:', error);
});

start();