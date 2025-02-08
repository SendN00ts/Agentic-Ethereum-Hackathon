require('dotenv').config();
const axios = require('axios');

console.log('Starting application...');

const config = {
  agentUrl: process.env.AGENT_URL,
  authHeader: process.env.AUTH_HEADER,
  interval: parseInt(process.env.POST_INTERVAL || '1200000'), // 20 minutes in milliseconds
  timezone: process.env.TIMEZONE || 'Europe/Berlin',
  minEngagementThreshold: 5,
  youtubeApiKey: process.env.YOUTUBE_API_KEY // Add YouTube API Key from .env
};

console.log('Checking environment variables...');
console.log('Environment check:', {
  hasAgentUrl: !!config.agentUrl,
  hasAuthHeader: !!config.authHeader,
  hasInterval: !!config.interval,
  intervalValue: config.interval,
  timezone: config.timezone,
  hasYouTubeApiKey: !!config.youtubeApiKey
});

const currentDate = new Date();
const dateString = currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

const prompts = [
  `It's ${dateString} - if this is the birthday of any influential deceased musicians, share a tribute tweet about their legacy`,
  "share a hot take about a music genre. Make it not exceed 280 characters and post it.",
  "share a hot take about a music artist. Make it not exceed 280 characters and post it.",
  "recommend a song and share its YouTube link - tell us why it matters. Make it not exceed 280 characters and post it.",
  "share an underrated track with its YouTube link - what makes it special? Make it not exceed 280 characters and post it.",
  "pick an essential song, drop the YouTube link, and tell us its impact. Make it not exceed 280 characters and post it.",
  "share your thoughts about a topic regarding music. Make it not exceed 280 characters and post it.",
  "share a music history fact that actually not everyone knows. Make it not exceed 280 characters and post it.",
  "Share album anniversary celebrations of famous albums. Make it not exceed 280 characters and post it.",
  "which classic album deserves another listen? Make it not exceed 280 characters and post it.",
  "share a song that changed your view of music lately? Make it not exceed 280 characters and post it."
];

const tweetHistory = [];

function cleanURL(url) {
  return url.replace(/\s+/g, '');
}

// ✅ Fetch YouTube Link for a Song
async function getYouTubeLink(songTitle) {
    const query = encodeURIComponent(songTitle + " official music video");
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&maxResults=1&key=${config.youtubeApiKey}`;

    try {
        const response = await axios.get(url);
        if (response.data.items.length > 0) {
            const videoId = response.data.items[0].id.videoId;
            return `https://www.youtube.com/watch?v=${videoId}`;
        } else {
            return null; // No result found
        }
    } catch (error) {
        console.error("YouTube API Error:", error);
        return null;
    }
}

// ✅ Ensure Tweets Stay Within 280 Characters
function truncateTweet(text) {
    return text.length > 280 ? text.slice(0, 277) + "..." : text;
}

async function sendTweet() {
  try {
    const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
    console.log(`Attempting to send tweet with prompt: ${randomPrompt}`);

    let tweetText = randomPrompt;

    // Check if the prompt involves a song recommendation and fetch a YouTube link
    if (randomPrompt.includes("recommend a song") || randomPrompt.includes("underrated track") || randomPrompt.includes("essential song")) {
        let songRecommendation = "David Bowie – Life on Mars?"; // Replace with AI-generated song title
        let youtubeLink = await getYouTubeLink(songRecommendation);

        if (youtubeLink) {
            tweetText = `${songRecommendation} - a song that defined an era. Listen here: ${youtubeLink}`;
        } else {
            tweetText = `${songRecommendation} - an iconic track. Look it up!`;
        }
    }

    // Truncate the tweet if needed
    tweetText = truncateTweet(tweetText);

    const response = await axios.post(config.agentUrl, {
      user: "Synthereum",
      text: tweetText,
      action: "POST",
      forceAction: true,
      shouldTweet: true
    }, {
      headers: {
        'Authorization': config.authHeader,
        'Content-Type': 'application/json'
      }
    });

    console.log('Tweet response:', response.data);

    if (response.data && response.data.text) {
      const tweetContent = response.data.text.replace(/https?:\/\/[^\s]+/g, (url) => cleanURL(url));

      if (response.data.id) {
        tweetHistory.push({
          id: response.data.id,
          prompt: randomPrompt,
          timestamp: new Date(),
          text: tweetContent
        });

        if (tweetHistory.length > 100) {
          tweetHistory.shift();
        }
      }

      console.log('Tweet posted successfully:', response.status);
      return true;
    }
    return false;
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
  console.log(`Tweet interval set to ${config.interval / 1000} seconds`);
  console.log('Creating initial tweet...');

  await sendTweetWithRetry();

  console.log('Setting up intervals...');

  setInterval(async () => {
    console.log('Running scheduled tweet...');
    await sendTweetWithRetry();
  }, config.interval);

  setInterval(async () => {
    console.log('Running engagement tracking...');
    await trackEngagement();
  }, 6 * 60 * 60 * 1000);
}

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
});

start().catch(error => {
  console.error('Failed to start application:', error);
});