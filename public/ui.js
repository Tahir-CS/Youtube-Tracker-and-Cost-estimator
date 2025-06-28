// ui.js - DOM manipulation and rendering
import { formatNumber } from './utils.js';
import { renderVideoStatsChart } from './charts.js';

export function displayChannelInfo(channelData) {
  const channelInfo = document.getElementById('channelInfo');
  const snippet = channelData.snippet;
  const statistics = channelData.statistics;
  channelInfo.innerHTML = `
    <div class="channel-card">
      <img src="${snippet.thumbnails.medium.url}" alt="${snippet.title}" class="channel-avatar">
      <div class="channel-details">
        <h2>${snippet.title}</h2>
        <p>Subscribers: ${parseInt(statistics.subscriberCount).toLocaleString()}</p>
        <p>Total Videos: ${parseInt(statistics.videoCount).toLocaleString()}</p>
        <p>Total Views: ${parseInt(statistics.viewCount).toLocaleString()}</p>
        <p class="channel-description">${snippet.description.substring(0, 200)}...</p>
      </div>
    </div>
  `;
}

export function showNotification(msg) {
  const status = document.getElementById('statusMessage');
  status.textContent = msg;
  status.style.background = '#fffbe6';
  status.style.color = '#c4302b';
  status.style.border = '1px solid #ffe58f';
  status.style.padding = '8px 0';
  setTimeout(() => {
    status.textContent = '';
    status.style.background = '';
    status.style.color = '';
    status.style.border = '';
    status.style.padding = '';
  }, 3500);
}
