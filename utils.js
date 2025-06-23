// utils.js - Utility/helper functions

export function extractChannelId(input) {
  const channelIdMatch = input.match(/(?:channel\/|user\/|c\/)?([a-zA-Z0-9_-]{24,})/);
  if (channelIdMatch) {
    return channelIdMatch[1];
  }
  return input;
}

export function formatNumber(num) {
  if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
  return num.toString();
}
