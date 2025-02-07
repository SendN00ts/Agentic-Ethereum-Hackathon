require('dotenv').config();
const axios = require('axios');

const config = {
  agentUrl: process.env.AGENT_URL,
  authHeader: process.env.AUTH_HEADER,
  interval: parseInt(process.env.POST_INTERVAL || '3600000'),
  timezone: process.env.TIMEZONE || 'Europe/Berlin',
  //optimalPostTimes: [9, 13, 17, 21], // Hours in 24h format
  minEngagementThreshold: 5
};

// Your existing environment checks
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

// Store tweet history
const tweetHistory = [];

function isValidMusicContent(response) {
  if (response.includes('youtube')) {
    response = response.replace(/https?:\/\/[^\s]+/g, (url) => cleanURL(url));
  }
  const cryptoTerms = ['crypto', 'etf', 'market', 'bitcoin', 'solana', 'xrp', 'yield', 'investment', 'trading', 'price'];
  const musicTerms = ['music', 'song', 'artist', 'band', 'album', 'genre', 'track', 'sound'];
  
  return !cryptoTerms.some(term => response.toLowerCase().includes(term)) &&
         musicTerms.some(term => response.toLowerCase().includes(term));
}

function cleanURL(url) {
  return url.replace(/\s+/g, '');
}

function isValidMusicContent(response) {
  // Existing validation
  if (response.includes('youtube')) {
    const text = response.replace(/https?:\/\/[^\s]+/g, (url) => cleanURL(url));
    response = text;
  }
  return !cryptoTerms.some(term => response.toLowerCase().includes(term)) &&
         musicTerms.some(term => response.toLowerCase().includes(term));
}

// Add URL validation to sendTweet function
if (response.data && response.data.text) {
  response.data.text = response.data.text.replace(/https?:\/\/[^\s]+/g, (url) => cleanURL(url));
}

async function isOptimalPostTime() {
  const now = new Date();
  const hour = now.getHours();
  return config.optimalPostTimes.includes(hour);
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
      if (!isValidMusicContent(response.data.text)) {
        console.log('Non-music content detected, retrying...');
        return false;
      }

      // Store tweet in history if successful
      if (response.data.id) {
        tweetHistory.push({
          id: response.data.id,
          prompt: randomPrompt,
          timestamp: new Date(),
          text: response.data.text
        });

        // Keep history manageable
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

// Your existing sendTweetWithRetry function stays the same

async function start() {
  console.log('Starting tweet automation...');
  console.log(`Tweet interval set to ${config.interval/1000} seconds`);
  console.log(`Optimal posting times: ${config.optimalPostTimes.join(', ')}:00`);
  
  await sendTweetWithRetry();
  
  // Regular tweet interval
  setInterval(async () => {
    await sendTweetWithRetry();
  }, config.interval);

  // Engagement tracking interval (every 6 hours)
  setInterval(async () => {
    await trackEngagement();
  }, 6 * 60 * 60 * 1000);
}

// Your existing error handlers stay the same

start();