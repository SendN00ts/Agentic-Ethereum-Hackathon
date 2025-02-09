require('dotenv').config();
const axios = require('axios');

console.log('Starting Synthereum...');

const config = {
  agentUrl: process.env.AGENT_URL,
  authHeader: process.env.AUTH_HEADER,
  interval: parseInt(process.env.POST_INTERVAL || '1200000'), // 20 minutes in milliseconds
  timezone: process.env.TIMEZONE || 'Europe/Berlin',
  minEngagementThreshold: 5,
  youtubeApiKey: process.env.YOUTUBE_API_KEY // YouTube API Key
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
  "Share a hot take about a music genre. Make it not exceed 280 characters and post it.",
  "Share a hot take about a music artist. Make it not exceed 280 characters and post it.",
  "Recommend a song and share its YouTube link - tell us why it matters. Make it not exceed 280 characters and post it.",
  "Share an underrated track with its YouTube link - what makes it special? Make it not exceed 280 characters and post it.",
  "Pick an essential song, drop the YouTube link, and tell us its impact. Make it not exceed 280 characters and post it.",
  "Share your thoughts about a topic regarding music. Make it not exceed 280 characters and post it.",
  "Share a music history fact that actually not everyone knows. Make it not exceed 280 characters and post it.",
  "Share album anniversary celebrations of famous albums. Make it not exceed 280 characters and post it.",
  "Which classic album deserves another listen? Make it not exceed 280 characters and post it.",
  "Share a song that changed your view of music lately? Make it not exceed 280 characters and post it."
];

const tweetHistory = [];

function cleanURL(url) {
  return url.replace(/\s+/g, '');
}

async function getYouTubeLink(songTitle) {
    const query = encodeURIComponent(songTitle + " official music video");
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&maxResults=1&key=${config.youtubeApiKey}`;

    console.log(`Searching YouTube for: ${songTitle}`);
    console.log(`API URL: ${url}`);

    try {
        const response = await axios.get(url);
        if (response.data.items.length > 0) {
            const videoId = response.data.items[0].id.videoId;
            const videoTitle = response.data.items[0].snippet.title;
            console.log(`Found: ${videoTitle} - https://www.youtube.com/watch?v=${videoId}`);
            return `https://www.youtube.com/watch?v=${videoId}`;
        } else {
            console.log("No YouTube result found.");
            return null;
        }
    } catch (error) {
        console.error("YouTube API Error:", error);
        return null;
    }
}

function truncateTweet(text, link = null) {
    const maxLength = 280;

    if (link) {
        const linkLength = link.length + 1; // +1 for a space before the link
        const textLength = maxLength - linkLength;

        if (text.length > textLength) {
            return text.slice(0, textLength - 3) + "... " + link; 
        } else {
            return text + " " + link;
        }
    } else {
        return text.length > maxLength ? text.slice(0, maxLength - 3) + "..." : text;
    }
}

async function sendTweet() {
  try {
    const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
    console.log(`Attempting to send tweet with prompt: ${randomPrompt}`);

    let tweetText = randomPrompt;
    let youtubeLink = null;

    if (randomPrompt.includes("recommend a song") || randomPrompt.includes("underrated track") || randomPrompt.includes("essential song")) {
        let songRecommendation = "David Bowie – Life on Mars?";
        youtubeLink = await getYouTubeLink(songRecommendation);

        if (youtubeLink) {
            tweetText = `${songRecommendation} - a song that defined an era.`;
        } else {
            tweetText = `${songRecommendation} - an iconic track. Look it up!`;
        }
    }

    tweetText = truncateTweet(tweetText, youtubeLink);

    console.log(`Final Tweet: ${tweetText}`);

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