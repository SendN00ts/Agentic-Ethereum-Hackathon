require('dotenv').config();
const axios = require('axios');

// Configuration
const config = {
  agentUrl: process.env.AGENT_URL,
  authHeader: process.env.AUTH_HEADER,
  interval: parseInt(process.env.POST_INTERVAL || '14400000'), // 4 hours default
};

// After config initialization
console.log('Environment check:');
console.log('Agent URL configured:', !!config.agentUrl);
console.log('Auth Header configured:', !!config.authHeader);
console.log('Interval configured:', config.interval);

// Array of different prompts
const prompts = [
  "share a hot take about a music genre",
  "share a hot take about a music style",
  "share a hot take about an music artists",
  "Post a music recommendation of the day and link the song on youtube",
  "tweet about emerging music trends",
  "share your thoughts about a topic regarding music"
];

// Main tweet function
async function sendTweet() {
  try {
    // Randomly select a prompt
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

// Retry mechanism
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

// Start the application
async function start() {
  console.log('Starting tweet automation...');
  console.log(`Tweet interval set to ${config.interval/1000} seconds`);
  
  // Initial tweet
  await sendTweetWithRetry();
  
  // Schedule regular tweets
  setInterval(async () => {
    await sendTweetWithRetry();
  }, config.interval);
}

// Error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
});

// Start the application
start();