const axios = require('axios');
const cheerio = require('cheerio');

const extractVideoId = (url) => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?#]+)/,
    /youtube\.com\/shorts\/([^/?]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

const fetchWithYouTubeAPI = async (videoId) => {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('No API key');
  
  const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
    params: {
      part: 'snippet,contentDetails',
      id: videoId,
      key: apiKey,
    },
  });
  
  const item = response.data.items?.[0];
  if (!item) throw new Error('Video not found');
  
  const duration = item.contentDetails.duration;
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  const hours = (match[1] || '').replace('H', '');
  const minutes = (match[2] || '').replace('M', '');
  const seconds = (match[3] || '').replace('S', '');
  let formattedDuration = '';
  if (hours) formattedDuration += `${hours.padStart(2, '0')}:`;
  formattedDuration += `${(minutes || '0').padStart(2, '0')}:`;
  formattedDuration += `${(seconds || '0').padStart(2, '0')}`;
  
  return {
    youtubeId: videoId,
    title: item.snippet.title,
    thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
    duration: formattedDuration,
  };
};

const fetchWithCheerio = async (videoId) => {
  const response = await axios.get(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });
  
  const $ = cheerio.load(response.data);
  const title = $('meta[property="og:title"]').attr('content') || 
                $('title').text().replace(' - YouTube', '');
  const thumbnail = $('meta[property="og:image"]').attr('content') || 
                    `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  
  return {
    youtubeId: videoId,
    title: title.trim(),
    thumbnail,
    duration: null,
  };
};

const getVideoMetadata = async (url) => {
  const videoId = extractVideoId(url);
  if (!videoId) throw new Error('Invalid YouTube URL');
  
  try {
    const metadata = await fetchWithYouTubeAPI(videoId);
    return { ...metadata, fallback: false };
  } catch (error) {
    console.error('YouTube API failed, using cheerio fallback:', error.message);
    const metadata = await fetchWithCheerio(videoId);
    return { ...metadata, fallback: true };
  }
};

module.exports = { getVideoMetadata, extractVideoId };