require('dotenv').config();
const axios = require('axios');

const config = {
 agentUrl: process.env.AGENT_URL,
 authHeader: process.env.AUTH_HEADER,
 interval: parseInt(process.env.POST_INTERVAL || '3600000'),
 timezone: process.env.TIMEZONE || 'Europe/Berlin',
 //optimalPostTimes: [7, 11, 15, 19],
 minEngagementThreshold: 5,
 pollInterval: 24 * 60 * 60 * 1000
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
 "share a song that changed your view of music lately?"
];

const pollTypes = [
 "whos the better artist in GENRE?", 
 "Most influential between GENRE1 vs GENRE2 artist?",
 "Better voice: ARTIST1 or ARTIST2?",
 "More innovative sound: ARTIST1 or ARTIST2?",
 "Most impactful album: ALBUM1 or ALBUM2?",
 "Better live performer: ARTIST1 or ARTIST2?"
];

const tweetHistory = [];

function cleanURL(url) {
 return url.replace(/\s+/g, '');
}

function isValidMusicContent(response) {
 if (response.includes('youtube')) {
   response = response.replace(/https?:\/\/[^\s]+/g, (url) => cleanURL(url));
 }
 const cryptoTerms = ['crypto', 'etf', 'market', 'bitcoin', 'solana', 'xrp', 'yield', 'investment', 'trading', 'price'];
 const musicTerms = ['music', 'song', 'artist', 'band', 'album', 'genre', 'track', 'sound'];
 
 return !cryptoTerms.some(term => response.toLowerCase().includes(term)) &&
        musicTerms.some(term => response.toLowerCase().includes(term));
}

async function isOptimalPostTime() {
 const now = new Date();
 const hour = now.getHours();
 return config.optimalPostTimes.includes(hour);
}

async function createPoll() {
 try {
   const randomPollType = pollTypes[Math.floor(Math.random() * pollTypes.length)];
   
   const response = await axios.post(config.agentUrl, {
     user: "Synthereum",
     text: `Create a music poll: ${randomPollType}`,
     action: "Poll"
   }, {
     headers: {
       'Authorization': config.authHeader,
       'Content-Type': 'application/json'
     }
   });

   console.log('Poll created successfully');
   return response.data;
 } catch (error) {
   console.error('Poll creation error:', error);
   return null;
 }
}

async function checkTweetEngagement(tweetId) {
 try {
   const response = await axios.get(`${config.agentUrl}/tweet/${tweetId}`, {
     headers: {
       'Authorization': config.authHeader,
       'Content-Type': 'application/json'
     }
   });
   
   return {
     likes: response.data.likes || 0,
     replies: response.data.replies || 0,
     retweets: response.data.retweets || 0
   };
 } catch (error) {
   console.error('Error checking engagement:', error);
   return null;
 }
}

async function trackEngagement() {
 for (const tweet of tweetHistory.slice(-10)) {
   const engagement = await checkTweetEngagement(tweet.id);
   if (engagement) {
     tweet.engagement = engagement;
     const totalEngagement = engagement.likes + engagement.retweets + engagement.replies;
     
     if (totalEngagement > config.minEngagementThreshold) {
       console.log(`High engagement tweet:`, {
         prompt: tweet.prompt,
         engagement: totalEngagement
       });
     }
   }
 }
}

async function sendTweet() {
 if (!await isOptimalPostTime()) {
   console.log('Not optimal posting time, skipping...');
   return false;
 }

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
     response.data.text = response.data.text.replace(/https?:\/\/[^\s]+/g, (url) => cleanURL(url));
     
     if (!isValidMusicContent(response.data.text)) {
       console.log('Non-music content detected, retrying...');
       return false;
     }

     if (response.data.id) {
       tweetHistory.push({
         id: response.data.id,
         prompt: randomPrompt,
         timestamp: new Date(),
         text: response.data.text
       });

       if (tweetHistory.length > 100) {
         tweetHistory.shift();
       }
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
 console.log(`Optimal posting times: ${config.optimalPostTimes.join(', ')}:00`);
 console.log('Poll interval set to 24 hours');
 
 await sendTweetWithRetry();
 await createPoll();
 
 setInterval(async () => {
   await sendTweetWithRetry();
 }, config.interval);

 setInterval(async () => {
   await trackEngagement();
 }, 6 * 60 * 60 * 1000);

 setInterval(async () => {
   await createPoll();
 }, config.pollInterval);
}

process.on('uncaughtException', (error) => {
 console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
 console.error('Unhandled Rejection:', error);
});

start();