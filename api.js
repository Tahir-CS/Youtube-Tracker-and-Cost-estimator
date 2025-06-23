// api.js - Handles all API calls (YouTube Data API, Gemini AI, and App Backend)
import { extractChannelId } from './utils.js';

const API_BASE_URL = 'http://localhost:3001'; // Your backend URL

// --- Authentication ---
export async function sendGoogleTokenToBackend(googleIdToken) {
    const response = await fetch(`${API_BASE_URL}/auth/google/callback`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: googleIdToken }),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Authentication failed' }));
        throw new Error(errorData.error || `Server error: ${response.status}`);
    }
    return response.json(); // { token: sessionToken, user: userData }
}

// --- Tracked Channels ---
export async function fetchTrackedChannels(sessionToken) {
    const response = await fetch(`${API_BASE_URL}/api/tracked-channels`, {
        headers: {
            'Authorization': `Bearer ${sessionToken}`,
        },
    });
    if (!response.ok) throw new Error('Failed to fetch tracked channels');
    return response.json();
}

export async function addTrackedChannel(sessionToken, channelId, channelName) {
    const response = await fetch(`${API_BASE_URL}/api/tracked-channels`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ channelId, channelName }),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to add channel' }));
        throw new Error(errorData.error || `Server error: ${response.status}`);
    }
    return response.json();
}

export async function removeTrackedChannel(sessionToken, channelId) {
    const response = await fetch(`${API_BASE_URL}/api/tracked-channels/${channelId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${sessionToken}`,
        },
    });
    if (!response.ok) throw new Error('Failed to remove channel');
    return response.json();
}

export async function setChannelAlert(sessionToken, channelId, alertConfig) { // alertConfig = { type, threshold }
    const response = await fetch(`${API_BASE_URL}/api/tracked-channels/${channelId}/alerts`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify(alertConfig),
    });
    if (!response.ok) throw new Error('Failed to set alert');
    return response.json();
}

export async function getChannelAlert(sessionToken, channelId) {
    const response = await fetch(`${API_BASE_URL}/api/tracked-channels/${channelId}/alerts`, {
        headers: {
            'Authorization': `Bearer ${sessionToken}`,
        },
    });
    if (!response.ok) {
        if (response.status === 404) return null; // No alert set is not an error
        throw new Error('Failed to get alert');
    }
    return response.json();
}

export async function getChannelSnapshots(sessionToken, channelId) {
    const response = await fetch(`${API_BASE_URL}/api/tracked-channels/${channelId}/snapshots`, {
        headers: {
            'Authorization': `Bearer ${sessionToken}`, // May not be strictly needed if snapshots are public once tracked
        },
    });
    if (!response.ok) throw new Error('Failed to fetch channel snapshots');
    return response.json();
}

// --- YouTube Data API Calls ---
export async function resolveToChannelId(input) {
  if (input.startsWith('UC')) return input;
  const urlUser = `http://localhost:3001/api/youtube?endpoint=channels&part=id&forUsername=${input}`;
  const resUser = await fetch(urlUser);
  const dataUser = await resUser.json();
  if (dataUser.items && dataUser.items.length > 0) {
    return dataUser.items[0].id;
  }
  const urlCustom = `http://localhost:3001/api/youtube?endpoint=search&part=snippet&type=channel&q=${input}`;
  const resCustom = await fetch(urlCustom);
  const dataCustom = await resCustom.json();
  if (dataCustom.items && dataCustom.items.length > 0) {
    return dataCustom.items[0].snippet.channelId;
  }
  throw new Error('Channel not found');
}

export async function fetchChannelData(channelId) {
  const url = `http://localhost:3001/api/youtube?endpoint=channels&part=snippet,statistics&id=${channelId}`;
  const response = await fetch(url);
  const data = await response.json();
  if (data.items && data.items.length > 0) {
    return data.items[0];
  } else {
    throw new Error('Channel not found');
  }
}

export async function fetchRecentVideos(channelId) {
  let allVideos = [];
  let nextPageToken = '';
  do {
    const searchUrl = `http://localhost:3001/api/youtube?endpoint=search&key=none&channelId=${channelId}&part=snippet&order=date&maxResults=50&type=video${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();
    if (searchData.items && searchData.items.length > 0) {
      allVideos = allVideos.concat(searchData.items);
    }
    nextPageToken = searchData.nextPageToken;
  } while (nextPageToken);
  if (allVideos.length === 0) return [];
  const allVideoIds = allVideos.map(item => item.id.videoId).filter(Boolean);
  let allStats = [];
  for (let i = 0; i < allVideoIds.length; i += 50) {
    const batchIds = allVideoIds.slice(i, i + 50).join(',');
    const statsUrl = `http://localhost:3001/api/youtube?endpoint=videos&part=statistics,snippet&id=${batchIds}`;
    const statsResponse = await fetch(statsUrl);
    const statsData = await statsResponse.json();
    if (statsData.items && statsData.items.length > 0) {
      allStats = allStats.concat(statsData.items);
    }
  }
  allStats.sort((a, b) => new Date(b.snippet.publishedAt) - new Date(a.snippet.publishedAt));
  return allStats;
}

export async function callGeminiAPI(data) {
  const prompt = `\nYou are a YouTube analytics expert. Analyze this channel data and provide actionable insights:\n\nCHANNEL: ${data.channelName}\nDESCRIPTION: ${data.channelDescription}\nSUBSCRIBERS: ${data.totalSubscribers.toLocaleString()}\nTOTAL VIEWS: ${data.totalViews.toLocaleString()}\nTOTAL VIDEOS: ${data.totalVideos.toLocaleString()}\n\nRECENT VIDEOS:\n${data.recentVideos.map((v, i) => `\n${i+1}. \"${v.title}\"\n   Views: ${v.views.toLocaleString()} | Likes: ${v.likes.toLocaleString()} | Comments: ${v.comments.toLocaleString()}\n   Published: ${new Date(v.publishedAt).toLocaleDateString()}\n`).join('')}\n\nPlease provide:\n1. TOP TRENDING TOPICS (what content themes are performing best)\n2. CONTENT STRATEGY RECOMMENDATIONS (specific actionable advice)\n3. OPTIMAL POSTING INSIGHTS (best practices for this channel)\n4. ENGAGEMENT OPTIMIZATION TIPS (how to improve likes/comments)\n5. TRENDING PREDICTIONS (what content might work well in the future)\n\nFormat as JSON with these exact keys: trendingTopics, strategyRecommendations, postingInsights, engagementTips, futurePredictions\nEach should be an array of strings with specific, actionable advice.\n`;

  const response = await fetch('http://localhost:3001/api/gemini', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  const aiText = result.candidates[0].content.parts[0].text;
  try {
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      return null;
    }
  } catch (e) {
    return null;
  }
}

// --- YouTube Global Trends Section ---
let globalTrendsReloaded = false;

const fallbackTrends = [
    { heading: "AI-Generated Content", explanation: "Channels using AI for video creation, narration, and music are gaining traction." },
    { heading: "Short-Form Documentaries", explanation: "Bite-sized, high-quality documentaries on niche topics are highly engaging." },
    { heading: "Sustainable Living & DIY", explanation: "Content focused on eco-friendly lifestyles, upcycling, and DIY home projects is popular." }
];

function addRefreshButton(container) {
    // Ensure we don't add multiple buttons, especially during re-renders
    if (container.querySelector('.refresh-button-container')) {
        return;
    }

    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'refresh-button-container';
    buttonContainer.style.textAlign = 'center';
    buttonContainer.style.marginTop = '20px';

    const reloadBtn = document.createElement('button');
    reloadBtn.textContent = 'Refresh Trends';
    reloadBtn.className = 'btn btn-secondary'; // Assuming you have styles for this class
    reloadBtn.onclick = async () => {
      if (globalTrendsReloaded) {
        let errorDiv = container.querySelector('.error-message-bottom');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'error-message error-message-bottom';
            errorDiv.style.marginTop = '10px';
            buttonContainer.appendChild(errorDiv);
        }
        errorDiv.textContent = 'You can only reload the global trends once per session.';
        return;
      }
      globalTrendsReloaded = true;
      container.setAttribute('data-reloading', 'true');
      await fetchAndDisplayGlobalTrends();
    };
    buttonContainer.appendChild(reloadBtn);
    container.appendChild(buttonContainer);
}

function renderTrendsData(trendsData, container, isFallback = false) {
    const introText = isFallback 
        ? '(Offline) Showing previous global trends analysis:' 
        : 'Based on the latest global YouTube data, here are the top trending themes and topics right now:';
    
    const displayTrends = trendsData.slice(0, 3);

    // Clear previous content and render new trends
    container.innerHTML = `
      <div class="global-trends-card animated-fadein">
        <h2 class="global-trends-title">🔥 YouTube Global Trends</h2>
        <div class="global-trends-intro" style="color:#222;background:rgba(255,255,255,0.85);padding:8px 16px;border-radius:8px;font-weight:600;margin-bottom:2px;">${introText}</div>
        <canvas id="globalTrendsChart" height="120" style="margin-top: 4px; margin-bottom: 4px;"></canvas>
        <div class="trends-cards-list">
          ${displayTrends.map((t, i) => `
            <div class="trend-block-card animated-pop">
              <div class="trend-block-header"><span class="trend-block-icon">${i+1}.</span> <span class="trend-block-title">${t.heading}</span></div>
              <div class="trend-block-explanation">${t.explanation}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    setTimeout(() => {
        const chartEl = document.getElementById('globalTrendsChart');
        if (window.Chart && chartEl) {
            new Chart(chartEl.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: displayTrends.map(t => t.heading),
                    datasets: [{
                        label: 'Trending Topics',
                        data: displayTrends.map(() => Math.floor(Math.random() * 41) + 60), // Random data for visualization
                        backgroundColor: ['#ff5252', '#ffb300', '#40c4ff'],
                        borderRadius: 16,
                        barPercentage: 0.7,
                        maxBarThickness: 60
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    plugins: { legend: { display: false }, tooltip: { enabled: true } },
                    animation: { duration: 1200, easing: 'easeOutBounce' },
                    scales: {
                        x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#222', font: { size: 15 } } },
                        y: { grid: { display: false }, ticks: { color: '#222', font: { size: 15 } } }
                    }
                }
            });
        }
    }, 200);
    
    addRefreshButton(container);
}

async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 15000 } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const response = await fetch(resource, { ...options, signal: controller.signal });
  clearTimeout(id);
  return response;
}

export async function fetchAndDisplayGlobalTrends() {
  const trendsSection = document.getElementById('global-trends-section');
  if (!trendsSection) return;

  // Avoid re-fetching if already loaded and not explicitly reloading
  if (trendsSection.hasAttribute('data-loaded') && !trendsSection.hasAttribute('data-reloading')) {
      return;
  }

  trendsSection.innerHTML = `
    <div class="global-trends-loading">
      <div class="spinner"></div>
      <span>Loading global YouTube trends...</span>
    </div>
  `;

  try {
    const res = await fetchWithTimeout('http://localhost:3001/api/youtube/global-trends', { timeout: 15000 });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    let summary = data.candidates?.[0]?.content?.parts?.[0]?.text || data.text || '';
    const trendBlocks = [];
    const trendRegex = /([\d]+[.)]|[-*•✅])?\s*([A-Z][^:]+):\s*([\s\S]*?)(?=(?:\n[\d]+[.)]|\n[-*•✅]|\n[A-Z][^:]+:|$))/g;
    let match;
    while ((match = trendRegex.exec(summary)) !== null) {
      trendBlocks.push({ heading: match[2].trim(), explanation: match[3].replace(/\n+/g, ' ').trim() });
    }

    if (trendBlocks.length === 0 && summary) {
      summary.split(/\n+/).forEach((line, i) => {
        if (line.length > 15) trendBlocks.push({ heading: `Trend ${i+1}`, explanation: line });
      });
    }
    
    if (trendBlocks.length > 0) {
        renderTrendsData(trendBlocks, trendsSection);
    } else {
        throw new Error("Could not parse trends from API response.");
    }

  } catch (err) {
    let errorMessage = 'Could not load global trends. The service may be temporarily unavailable.';
    if (err.name === 'AbortError') {
      errorMessage = 'Loading global trends timed out. Please try again later.';
    }
    trendsSection.innerHTML = `
      <div class="global-trends-card animated-fadein">
        <h2 class="global-trends-title">🔥 YouTube Global Trends</h2>
        <div class="error-message">${errorMessage}</div>
        <div style="text-align:center; margin-top: 12px;">
            <button id="showPreviousTrendsBtn" class="btn btn-primary">Show Previous Trends</button>
        </div>
      </div>
    `;
    const showPreviousBtn = document.getElementById('showPreviousTrendsBtn');
    if(showPreviousBtn) {
        showPreviousBtn.onclick = () => {
            renderTrendsData(fallbackTrends, trendsSection, true);
        };
    }
    addRefreshButton(trendsSection);
  } finally {
    trendsSection.setAttribute('data-loaded', '1');
    trendsSection.removeAttribute('data-reloading');
  }
}

// --- Footer ---
export function renderFooter() {
  let footer = document.getElementById('main-footer');
  if (!footer) {
    footer = document.createElement('footer');
    footer.id = 'main-footer';
    document.body.appendChild(footer);
  }
  footer.innerHTML = `
    <div class="footer-content">
      <div class="footer-dev">
        <span class="footer-name">M TAHIR BUTT</span> &mdash; MERN Stack Web Developer
      </div>
      <div class="footer-links">
        <div class="footer-email-section">
          <span class="footer-email-label">Email:</span>
          <a href="mailto:mtahirbutt1005@gmail.com" class="footer-link" title="Email">mtahirbutt1005@gmail.com</a>
        </div>
        <div class="footer-linkedin-section">
          <span class="footer-linkedin-label">Click to visit my LinkedIn:</span>
          <a href="https://www.linkedin.com/in/tahir-butt-8345a5329/" class="footer-link" target="_blank" rel="noopener" title="LinkedIn"><img src="https://img.icons8.com/ios-filled/20/ffffff/linkedin.png" alt="LinkedIn"/> LinkedIn Profile</a>
        </div>
      </div>
      <div class="footer-tagline">Passionate about building modern, secure, and beautiful web apps.</div>
    </div>
  `;

  // Apply styles directly
  footer.style.display = 'block';
  footer.style.position = 'relative';
  footer.style.zIndex = '1000';
  footer.style.backgroundColor = 'var(--footer-bg, #fff8e1)';
  footer.style.color = 'var(--footer-text-color, #444)';
  footer.style.padding = '50px 25px';
  footer.style.textAlign = 'center';
  footer.style.width = '100%';
  footer.style.boxSizing = 'border-box'; // Add this to ensure padding doesn't add to width
  footer.style.marginTop = '80px';
  footer.style.borderTop = '3px solid var(--primary-accent, #ffb300)';
  footer.style.boxShadow = '0 -3px 10px rgba(255, 179, 0, 0.15)';
  footer.style.lineHeight = '1.8';

  const footerLinksDiv = footer.querySelector('.footer-links');
  if (footerLinksDiv) {
    footerLinksDiv.style.marginTop = '15px';
    footerLinksDiv.style.marginBottom = '15px';
  }

  const emailSection = footer.querySelector('.footer-email-section');
  if (emailSection) {
    emailSection.style.marginBottom = '10px';
  }

  const emailLabel = footer.querySelector('.footer-email-label');
  if (emailLabel) {
    emailLabel.style.display = 'block'; // Make label take its own line
    emailLabel.style.marginBottom = '3px'; // Space between "Email:" and the link
    emailLabel.style.fontWeight = 'bold'; // Optional: make the label bold
  }

  const linkedInLabel = footer.querySelector('.footer-linkedin-label');
  if (linkedInLabel) {
    linkedInLabel.style.display = 'block';
    linkedInLabel.style.marginBottom = '5px';
  }
}

// --- Add to main.js or call on page load ---
// import { fetchAndDisplayGlobalTrends } from './api.js';
// window.addEventListener('DOMContentLoaded', fetchAndDisplayGlobalTrends);
// import { renderFooter } from './api.js';
// window.addEventListener('DOMContentLoaded', renderFooter);
