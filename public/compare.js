// compare.js - Competitor comparison logic and UI
import { formatNumber } from './utils.js';
import { renderComparisonCharts } from './charts.js';

export let comparedChannels = [];

export function addComparedChannel(channelData) {
  if (comparedChannels.find(c => c.id === channelData.id)) return;
  comparedChannels.push({
    id: channelData.id,
    title: channelData.snippet.title,
    avatar: channelData.snippet.thumbnails.medium.url,
    subs: channelData.statistics.subscriberCount,
    views: channelData.statistics.viewCount,
    videos: channelData.statistics.videoCount
  });
}

export function removeComparedChannel(idx) {
  comparedChannels.splice(idx, 1);
}

export function renderCompareSection() {
  const compareSection = document.getElementById('compareSection');
  if (comparedChannels.length === 0) {
    compareSection.style.display = 'none';
    compareSection.innerHTML = '';
    return;
  }
  compareSection.style.display = 'flex';
  compareSection.innerHTML = comparedChannels.map((c, i) => `
    <div class="compared-channel-card">
      <button class="remove-compare-btn" title="Remove" onclick="window.removeComparedChannel && window.removeComparedChannel(${i})">&times;</button>
      <img src="${c.avatar}" alt="${c.title}" style="width:64px;height:64px;border-radius:50%;margin-bottom:8px;">
      <h3>${c.title}</h3>
      <p>Subscribers: <b>${parseInt(c.subs).toLocaleString()}</b></p>
      <p>Total Views: <b>${parseInt(c.views).toLocaleString()}</b></p>
      <p>Videos: <b>${parseInt(c.videos).toLocaleString()}</b></p>
    </div>
  `).join('');
  renderComparisonCharts(comparedChannels);
}
