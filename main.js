// main.js - App entry point and orchestration
import { extractChannelId, formatNumber } from './utils.js';
import { 
    resolveToChannelId, 
    fetchChannelData, 
    fetchRecentVideos, 
    fetchAndDisplayGlobalTrends,
    sendGoogleTokenToBackend,
    fetchTrackedChannels,
    addTrackedChannel as apiAddTrackedChannel, // Renamed to avoid conflict
    removeTrackedChannel as apiRemoveTrackedChannel, // Renamed
    setChannelAlert as apiSetChannelAlert, // Renamed
    getChannelAlert as apiGetChannelAlert, // Renamed
    getChannelSnapshots as apiGetChannelSnapshots // Renamed
} from './api.js';
import { renderVideoStatsChart, renderComparisonCharts } from './charts.js';
import { displayChannelInfo, showNotification } from './ui.js';
import { comparedChannels, addComparedChannel, removeComparedChannel } from './compare.js';
import { analyzeChannelTrendsWithAI } from './ai.js';

// Expose global functions for HTML event handlers (needed for remove compare button)
window.removeComparedChannel = removeComparedChannel;
window.handleCredentialResponse = handleCredentialResponse;

// --- Video Pagination State ---
let allFetchedVideos = [];
let videosShownCount = 0;
const VIDEOS_PER_PAGE = 10;

// --- Earnings CPM Table and UI ---
const CPM_TABLE = {
  "United States": { CPM_min: 4, CPM_max: 10 },
  "Canada": { CPM_min: 3, CPM_max: 7 },
  "United Kingdom": { CPM_min: 3, CPM_max: 7 },
  "Australia": { CPM_min: 3, CPM_max: 8 },
  "Germany": { CPM_min: 2.5, CPM_max: 6 },
  "France": { CPM_min: 2, CPM_max: 5 },
  "India": { CPM_min: 0.25, CPM_max: 1 },
  "Pakistan": { CPM_min: 0.2, CPM_max: 0.8 },
  "Brazil": { CPM_min: 0.5, CPM_max: 1.5 },
  "Russia": { CPM_min: 0.5, CPM_max: 1.5 },
  "Unknown": { CPM_min: 1, CPM_max: 3 }
};

function renderEarningsUI() {
  const channelInfo = document.getElementById('channelInfo');
  if (!document.getElementById('earningsEstimatorCard')) {
    const earningsCard = document.createElement('div');
    earningsCard.className = 'earnings-card';
    earningsCard.id = 'earningsEstimatorCard';
    earningsCard.innerHTML = `
      <h3>💰 Auto Estimated Earnings</h3>
      <div style="margin-bottom:10px;">
        <label for="countrySelect">Country:</label>
        <select id="countrySelect">
          ${Object.keys(CPM_TABLE).map(c => `<option value="${c}">${c}</option>`).join('')}
        </select>
        <span class="info-tooltip" title="Select the country where most of the channel's audience is from. CPM = Cost Per 1000 Monetized Views.">?</span>
      </div>
      <div id="autoEarningsResult"></div>
      <div class="estimator-note">These are estimated values. Actual earnings depend on factors like audience region, engagement, and video length.</div>
    `;
    channelInfo.appendChild(earningsCard);
  }
  if (!document.getElementById('manualEarningsCard')) {
    const manualCard = document.createElement('div');
    manualCard.className = 'earnings-card';
    manualCard.id = 'manualEarningsCard';
    manualCard.innerHTML = `
      <h3>🔧 Manual YouTube Earnings Calculator</h3>
      <div class="manual-fields">
        <label>Estimated Views: <input type="number" id="manualViews" min="0" value="10000"></label>
        <label>Country:
          <select id="manualCountry">
            ${Object.keys(CPM_TABLE).map(c => `<option value="${c}">${c}</option>`).join('')}
          </select>
        </label>
        <label>Custom CPM ($): <input type="number" id="manualCPM" min="0" step="0.01" placeholder="(optional)"></label>
        <label>Engagement Bonus (%): <input type="number" id="manualBonus" min="0" max="100" value="0"></label>
      </div>
      <button id="manualCalcBtn">Estimate</button>
      <div id="manualEarningsResult"></div>
      <div class="estimator-note">Try adjusting views, CPM, or engagement bonus to see how your earnings can grow!</div>
    `;
    channelInfo.appendChild(manualCard);
  }
}
function updateAutoEarnings(totalViews) {
  const country = document.getElementById('countrySelect').value;
  const cpm = CPM_TABLE[country] || CPM_TABLE['Unknown'];
  const avgCPM = ((cpm.CPM_min + cpm.CPM_max) / 2);
  const minEarnings = (totalViews / 1000) * cpm.CPM_min;
  const maxEarnings = (totalViews / 1000) * cpm.CPM_max;
  const avgEarnings = (totalViews / 1000) * avgCPM;
  document.getElementById('autoEarningsResult').innerHTML = `
    <b>Estimated Lifetime Earnings:</b><br>
    <span class="earnings-range">$${minEarnings.toLocaleString(undefined, {maximumFractionDigits:0})} - $${maxEarnings.toLocaleString(undefined, {maximumFractionDigits:0})}</span><br>
    <span class="earnings-cpm">Country: <b>${country}</b> | CPM Used: $${cpm.CPM_min} - $${cpm.CPM_max}</span>
  `;
}
function manualEarningsCalc() {
  const views = parseInt(document.getElementById('manualViews').value) || 0;
  const country = document.getElementById('manualCountry').value;
  const customCPM = parseFloat(document.getElementById('manualCPM').value);
  const bonus = parseFloat(document.getElementById('manualBonus').value) || 0;
  const cpm = CPM_TABLE[country] || CPM_TABLE['Unknown'];
  const avgCPM = (cpm.CPM_min + cpm.CPM_max) / 2;
  const CPM_used = isNaN(customCPM) ? avgCPM : customCPM;
  const EngagementFactor = 1 + (bonus / 100);
  const earnings = (views / 1000) * CPM_used * EngagementFactor;
  document.getElementById('manualEarningsResult').innerHTML = `
    <b>Estimated Earnings:</b> <span class="earnings-range">$${earnings.toLocaleString(undefined, {maximumFractionDigits:0})}</span><br>
    <span class="earnings-cpm">CPM Used: $${CPM_used.toFixed(2)} | Engagement Bonus: +${bonus}%</span>
  `;
}
function setupEarningsEvents(totalViews) {
  document.getElementById('countrySelect').addEventListener('change', () => updateAutoEarnings(totalViews));
  updateAutoEarnings(totalViews);
  document.getElementById('manualCalcBtn').addEventListener('click', (e) => {
    e.preventDefault();
    manualEarningsCalc();
  });
}

// --- UI Functions ---
// Remove duplicate definition of displayChannelInfo and showNotification
// These are now imported from ui.js

// --- Chart.js Loader ---
function loadChartJsIfNeeded() {
  if (!window.Chart) {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';
    script.onload = () => { window.ChartLoaded = true; };
    document.head.appendChild(script);
  }
}

// --- Display Videos with Pagination and Chart ---
function displayVideos(videos, reset = false) {
  const videosContainer = document.getElementById('videosContainer');
  if (reset || videos !== allFetchedVideos) {
    allFetchedVideos = videos;
    videosShownCount = 0;
  }
  if (!allFetchedVideos || allFetchedVideos.length === 0) {
    videosContainer.innerHTML = '<p>No videos found for this channel.</p>';
    return;
  }
  const toShow = allFetchedVideos.slice(0, videosShownCount + VIDEOS_PER_PAGE || VIDEOS_PER_PAGE);
  videosShownCount = toShow.length;
  loadChartJsIfNeeded();
  let country = 'Unknown';
  const countrySelect = document.getElementById('countrySelect');
  if (countrySelect) country = countrySelect.value;
  const CPM_TABLE = {
    "United States": { CPM_min: 4, CPM_max: 10 },
    "Canada": { CPM_min: 3, CPM_max: 7 },
    "United Kingdom": { CPM_min: 3, CPM_max: 7 },
    "Australia": { CPM_min: 3, CPM_max: 8 },
    "Germany": { CPM_min: 2.5, CPM_max: 6 },
    "France": { CPM_min: 2, CPM_max: 5 },
    "India": { CPM_min: 0.25, CPM_max: 1 },
    "Pakistan": { CPM_min: 0.2, CPM_max: 0.8 },
    "Brazil": { CPM_min: 0.5, CPM_max: 1.5 },
    "Russia": { CPM_min: 0.5, CPM_max: 1.5 },
    "Unknown": { CPM_min: 1, CPM_max: 3 }
  };
  const cpm = CPM_TABLE[country] || CPM_TABLE['Unknown'];
  const avgCPM = (cpm.CPM_min + cpm.CPM_max) / 2;
  const videosHTML = toShow.map((video, idx) => {
    const snippet = video.snippet;
    const statistics = video.statistics;
    const publishDate = new Date(snippet.publishedAt).toLocaleDateString();
    const chartId = `videoChart_${idx}`;
    const views = parseInt(statistics.viewCount || 0);
    const minEarnings = (views / 1000) * cpm.CPM_min;
    const maxEarnings = (views / 1000) * cpm.CPM_max;
    return `
      <div class="video-card video-card-flex">
        <img src="${snippet.thumbnails.medium.url}" alt="${snippet.title}" class="video-thumbnail">
        <div class="video-info">
          <h3>${snippet.title}</h3>
          <p>Views: ${views.toLocaleString()}</p>
          <p>Likes: ${parseInt(statistics.likeCount || 0).toLocaleString()} &nbsp; | &nbsp; Comments: ${parseInt(statistics.commentCount || 0).toLocaleString()}</p>
          <p>Published: ${publishDate}</p>
          <p class="video-earnings">Estimated Earnings: <span class="earnings-range">$${minEarnings.toLocaleString(undefined, {maximumFractionDigits:0})} - $${maxEarnings.toLocaleString(undefined, {maximumFractionDigits:0})}</span></p>
          <a href="https://www.youtube.com/watch?v=${video.id}" target="_blank">Watch Video</a>
        </div>
        <div class="video-chart-container video-chart-right">
          <canvas id="${chartId}" height="180"></canvas>
        </div>
      </div>
    `;
  }).join('');
  const showMoreBtn = (videosShownCount < allFetchedVideos.length)
    ? `<div style="text-align:center;margin:18px 0;"><button id="showMoreVideosBtn" class="show-more-btn">Show 10 More Videos</button></div>`
    : '';
  videosContainer.innerHTML = `<h3>Recent Videos:</h3>${videosHTML}${showMoreBtn}`;
  function renderAllCharts() {
    toShow.forEach((video, idx) => {
      const statistics = video.statistics;
      const chartId = `videoChart_${idx}`;
      const ctx = document.getElementById(chartId).getContext('2d');
      const views = parseInt(statistics.viewCount || 0);
      const likes = parseInt(statistics.likeCount || 0);
      const comments = parseInt(statistics.commentCount || 0);
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Views', 'Likes', 'Comments'],
          datasets: [{
            label: 'Stats',
            data: [views, likes, comments],
            backgroundColor: [
              '#c4302b',
              '#ffb300',
              '#228b22'
            ],
            borderRadius: 12,
            barPercentage: 0.7,
            categoryPercentage: 0.7,
            maxBarThickness: 60
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          plugins: {
            legend: { display: false },
            tooltip: { enabled: true }
          },
          scales: {
            x: {
              beginAtZero: true,
              grid: { color: '#eee' },
              ticks: { color: '#222', font: { size: 15 } }
            },
            y: {
              grid: { display: false },
              ticks: { color: '#222', font: { size: 15 } }
            }
          }
        }
      });
    });
  }
  if (window.Chart) {
    renderAllCharts();
  } else {
    const interval = setInterval(() => {
      if (window.Chart) {
        clearInterval(interval);
        renderAllCharts();
      }
    }, 60);
  }
  const btn = document.getElementById('showMoreVideosBtn');
  if (btn) {
    btn.onclick = (e) => {
      e.preventDefault();
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span>';
      setTimeout(() => {
        displayVideos(allFetchedVideos);
      }, 700);
    };
  }
}

// --- Compare Channels Feature ---
const compareSection = document.getElementById('compareSection');
document.getElementById('addToCompareBtn').onclick = async function(e) {
  e.preventDefault();
  const input = document.getElementById('channelInput').value.trim();
  if (!input) return;
  const extracted = extractChannelId(input);
  if (extracted.startsWith('UC') || input.includes('youtube.com')) {
    let channelId;
    try {
      channelId = await resolveToChannelId(extracted);
    } catch {
      document.getElementById('statusMessage').textContent = 'Channel not found!';
      return;
    }
    if (comparedChannels.find(c => c.id === channelId)) return;
    const channelData = await fetchChannelData(channelId);
    addComparedChannel(channelData);
    renderComparisonCharts();
  } else {
    const status = document.getElementById('statusMessage');
    status.textContent = 'Searching for channels...';
    const searchUrl = `http://localhost:3000/api/youtube?endpoint=search&part=snippet&type=channel&q=${encodeURIComponent(input)}&maxResults=10`;
    const res = await fetch(searchUrl);
    const data = await res.json();
    if (!data.items || data.items.length === 0) {
      status.textContent = 'No channels found with that name.';
      return;
    }
    const channelIds = data.items.map(item => item.snippet.channelId).join(',');
    const statsUrl = `http://localhost:3000/api/youtube?endpoint=channels&part=snippet,statistics&id=${channelIds}`;
    const statsRes = await fetch(statsUrl);
    const statsData = await statsRes.json();
    const sorted = statsData.items.sort((a, b) => parseInt(b.statistics.subscriberCount||0) - parseInt(a.statistics.subscriberCount||0));
    const channelInfo = document.getElementById('channelInfo');
    channelInfo.innerHTML = `<h3 style="text-align:left;margin-left:32px;">Select a channel to compare:</h3>` +
      sorted.map(ch => `
        <div class="channel-card selectable-channel-compare" data-channel-id="${ch.id}">
          <img src="${ch.snippet.thumbnails.medium.url}" class="channel-avatar" alt="${ch.snippet.title}">
          <div class="channel-details">
            <h2>${ch.snippet.title}</h2>
            <p>Subscribers: ${parseInt(ch.statistics.subscriberCount).toLocaleString()}</p>
            <p>Videos: ${parseInt(ch.statistics.videoCount).toLocaleString()}</p>
            <p>Likes: ${ch.statistics.likeCount ? parseInt(ch.statistics.likeCount).toLocaleString() : 'N/A'} | Comments: ${ch.statistics.commentCount ? parseInt(ch.statistics.commentCount).toLocaleString() : 'N/A'}</p>
            <p>${ch.snippet.description.substring(0, 100)}...</p>
          </div>
        </div>
      `).join('');
    status.textContent = '';
    // Attach click event handler to selectable-channel-compare cards
    document.querySelectorAll('.selectable-channel-compare').forEach(card => {
      card.addEventListener('click', async function() {
        const channelId = this.getAttribute('data-channel-id');
        console.log('Selected channel to compare:', channelId);
        if (comparedChannels.find(c => c.id === channelId)) return;
        status.textContent = 'Adding channel to compare...';
        const channelData = await fetchChannelData(channelId);
        addComparedChannel(channelData);
        renderComparisonCharts();
        status.textContent = '';
        channelInfo.innerHTML = '';
      });
    });
  }
};

// Remove duplicate definition of searchAndSelectChannel
// --- Remove the second definition below ---
// async function searchAndSelectChannel(input) { ... }

// --- Auth State ---
let currentSessionToken = localStorage.getItem('sessionToken');
let currentUser = JSON.parse(localStorage.getItem('currentUser'));

// --- Growth Graph State ---
let currentGrowthChart = null;

// --- DOM Elements ---
const authContainer = document.getElementById('authContainer');
const gsiButton = document.getElementById('gsiButton');
const userInfoDisplay = document.getElementById('userInfo');
const userNameDisplay = document.getElementById('userName');
const logoutButton = document.getElementById('logoutButton');
const growthAlertsDashboard = document.getElementById('growthAlertsDashboard');
const trackedChannelsListContainer = document.getElementById('trackedChannelsList');
const noTrackedChannelsMsg = document.getElementById('noTrackedChannels');
const growthGraphModalElement = document.getElementById('growthGraphModal');
const closeGraphModalBtn = document.getElementById('closeGraphModal');
const graphChannelNameElement = document.getElementById('graphChannelName');
const channelGrowthChartCanvas = document.getElementById('channelGrowthChart');
const mainChannelFormTrackButton = document.querySelector('#channelForm button[type="submit"]');

// --- Sign-In Modal Elements ---
const signInBtn = document.getElementById('signInBtn');
const googleSignInModal = document.getElementById('googleSignInModal');
const closeGoogleSignInModal = document.getElementById('closeGoogleSignInModal');

// --- Event Listeners ---
if (signInBtn && googleSignInModal && closeGoogleSignInModal) {
    signInBtn.addEventListener('click', () => {
        googleSignInModal.style.display = 'flex';
    });

    closeGoogleSignInModal.addEventListener('click', () => {
        googleSignInModal.style.display = 'none';
    });

    // Also close modal if user clicks on the background overlay
    googleSignInModal.addEventListener('click', (event) => {
        if (event.target === googleSignInModal) {
            googleSignInModal.style.display = 'none';
        }
    });
}

if (logoutButton) {
    logoutButton.addEventListener('click', handleLogout);
}

// --- Google Sign-In ---
function handleCredentialResponse(response) {
    sendGoogleTokenToBackend(response.credential)
        .then(data => {
            currentSessionToken = data.token;
            currentUser = data.user;
            localStorage.setItem('sessionToken', currentSessionToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            updateUIForAuthState();
            loadTrackedChannels();
            showNotification('Successfully signed in!', 'success');
            // Close the modal on successful sign-in
            if (googleSignInModal) {
                googleSignInModal.style.display = 'none';
            }
        })
        .catch(error => {
            console.error('Sign-in error:', error);
            showNotification(`Sign-in failed: ${error.message}`, 'error');
            updateUIForAuthState(); // Ensure UI resets if auth fails
        });
}

function initializeGoogleSignIn() {
    // Check if the Google Identity Services library is loaded and initialized
    if (typeof google === 'undefined' || typeof google.accounts === 'undefined' || typeof google.accounts.id === 'undefined') {
        console.warn('Google Identity Services script not loaded yet or not fully initialized. Retrying...');
        setTimeout(initializeGoogleSignIn, 500); // Retry after 500ms
        return;
    }

    try {
        google.accounts.id.initialize({
            client_id: '198900085311-kmt88sgiaeojcn5g53bqam2hk789qfj2.apps.googleusercontent.com',
            callback: handleCredentialResponse,
            ux_mode: 'popup', // Use popup mode to avoid OneTap and FedCM AbortError
            auto_select: false // Prevent auto sign-in
        });
        if (typeof updateUIForAuthState === 'function') {
            try { updateUIForAuthState(); } catch (e) { /* ignore if elements missing */ }
        }
    } catch (error) {
        console.error('Error initializing Google Sign-In:', error);
    }
}

// --- Logout ---
function handleLogout() {
    currentSessionToken = null;
    currentUser = null;
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('currentUser');
    google.accounts.id.disableAutoSelect(); // Prevent auto-selection on next load
    // Potentially call google.accounts.id.revoke(currentUser.email, done => {...}) for full sign out
    updateUIForAuthState();
    showNotification('Successfully logged out.', 'info');
}

// --- Update UI based on Auth State ---
function updateUIForAuthState() {
    if (currentSessionToken && currentUser) {
        if (signInBtn) signInBtn.style.display = 'none';
        userInfoDisplay.style.display = 'flex'; // or 'block' depending on your CSS
        userNameDisplay.textContent = `Welcome, ${currentUser.name || currentUser.email}!`;
        growthAlertsDashboard.style.display = 'block';
        if (mainChannelFormTrackButton) mainChannelFormTrackButton.textContent = 'Search & Add to Dashboard';
    } else {
        if (signInBtn) signInBtn.style.display = 'block';
        userInfoDisplay.style.display = 'none';
        userNameDisplay.textContent = '';
        growthAlertsDashboard.style.display = 'none';
        trackedChannelsListContainer.innerHTML = ''; // Clear dashboard
        noTrackedChannelsMsg.style.display = 'block';
         if (mainChannelFormTrackButton) mainChannelFormTrackButton.textContent = 'Track';
    }
}


// --- Tracked Channels Dashboard Logic ---
async function loadTrackedChannels() {
    if (!currentSessionToken) return;
    try {
        const channels = await fetchTrackedChannels(currentSessionToken);
        displayTrackedChannelsList(
            channels, 
            trackedChannelsListContainer, 
            noTrackedChannelsMsg,
            handleSetAlert,
            handleViewGrowth,
            handleRemoveTrackedChannel
        );
    } catch (error) {
        console.error('Failed to load tracked channels:', error);
        showNotification('Could not load your tracked channels.', 'error');
    }
}

async function handleAddTrackedChannel(channelId, channelName) {
    if (!currentSessionToken) {
        showNotification('Please sign in to add channels to your dashboard.', 'warning');
        return;
    }
    try {
        await apiAddTrackedChannel(currentSessionToken, channelId, channelName);
        showNotification(`Channel "${channelName}" added to your dashboard.`, 'success');
        loadTrackedChannels(); // Refresh the list
    } catch (error) {
        console.error('Failed to add tracked channel:', error);
        showNotification(`Error adding channel: ${error.message}`, 'error');
    }
}

async function handleRemoveTrackedChannel(channelId, channelName) {
    if (!currentSessionToken) return;
    if (!confirm(`Are you sure you want to remove "${channelName}" from your tracked channels?`)) return;

    try {
        await apiRemoveTrackedChannel(currentSessionToken, channelId);
        showNotification(`Channel "${channelName}" removed.`, 'info');
        loadTrackedChannels(); // Refresh the list
    } catch (error) {
        console.error('Failed to remove tracked channel:', error);
        showNotification(`Error removing channel: ${error.message}`, 'error');
    }
}

async function handleSetAlert(channelId, channelName, alertType, alertThreshold) {
    if (!currentSessionToken) return;
    if (alertType && (alertThreshold === null || alertThreshold === undefined || alertThreshold === '')) {
        showNotification('Please provide a threshold for the alert.', 'warning');
        return;
    }

    try {
        await apiSetChannelAlert(currentSessionToken, channelId, { type: alertType, threshold: parseInt(alertThreshold, 10) });
        showNotification(`Alert updated for "${channelName}".`, 'success');
        // Optionally, refresh just this item's alert display or reload all
        loadTrackedChannels(); 
    } catch (error) {
        console.error('Failed to set alert:', error);
        showNotification(`Error setting alert: ${error.message}`, 'error');
    }
}

async function handleViewGrowth(channelId, channelName) {
    if (!currentSessionToken) return;
    try {
        const snapshots = await apiGetChannelSnapshots(currentSessionToken, channelId);
        if (currentGrowthChart) {
            currentGrowthChart.destroy();
        }
        graphChannelNameElement.textContent = `Growth for ${channelName}`;
        
        if (!snapshots || snapshots.length === 0) {
            channelGrowthChartCanvas.style.display = 'none'; // Hide canvas
            const noDataMsg = document.createElement('p');
            noDataMsg.textContent = 'No growth data available yet for this channel. Snapshots are taken periodically.';
            // Clear previous no-data message if any
            const existingMsg = graphChannelNameElement.parentNode.querySelector('.no-data-message');
            if(existingMsg) existingMsg.remove();
            noDataMsg.className = 'no-data-message'; // Add class for styling
            graphChannelNameElement.parentNode.insertBefore(noDataMsg, channelGrowthChartCanvas.nextSibling);
            displayGrowthGraphModal();
            return;
        } else {
             channelGrowthChartCanvas.style.display = 'block'; // Show canvas
             const existingMsg = graphChannelNameElement.parentNode.querySelector('.no-data-message');
             if(existingMsg) existingMsg.remove();
        }


        const labels = snapshots.map(s => new Date(s.date).toLocaleDateString()).reverse();
        const subscriberData = snapshots.map(s => s.subscribers).reverse();
        // const viewData = snapshots.map(s => s.views).reverse(); // Optional: add view data

        currentGrowthChart = new Chart(channelGrowthChartCanvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Subscribers',
                    data: subscriberData,
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1,
                    fill: false
                }
                // Optional: Add dataset for views
                // {
                //   label: 'Total Views',
                //   data: viewData,
                //   borderColor: 'rgb(255, 99, 132)',
                //   tension: 0.1,
                //   fill: false
                // }
              ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: false // Or true, depending on preference
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: `Subscriber Growth for ${channelName}`
                    }
                }
            }
        });
        // displayGrowthGraphModal(); // Function does not exist, so this is commented out
    } catch (error) {
        console.error('Failed to fetch snapshots for graph:', error);
        showNotification(`Error loading growth data: ${error.message}`, 'error');
    }
}


// --- App Initialization & Event Listeners ---
document.getElementById('channelForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.getElementById('channelInput').value.trim();
  const extracted = extractChannelId(input);
  let channelIdToTrack;
  let channelDataForTracking;

  if (extracted.startsWith('UC') || input.includes('youtube.com')) {
    try {
      channelIdToTrack = await resolveToChannelId(extracted);
    } catch (err) {
      showNotification('Channel not found!');
      return;
    }
    document.getElementById('statusMessage').textContent = '';
    pushChannelState(channelIdToTrack); // For browser history
    channelDataForTracking = await fetchChannelData(channelIdToTrack);
    displayChannelInfo(channelDataForTracking); // Existing function to display basic info
    renderEarningsUI(); // Existing
    setupEarningsEvents(parseInt(channelDataForTracking.statistics.viewCount || 0)); // Existing
    const videos = await fetchRecentVideos(channelIdToTrack);
    displayVideos(videos, true); // Existing
    analyzeChannelTrendsWithAI(channelIdToTrack, videos, channelDataForTracking); // Existing

    // If user is logged in, offer to add to dashboard
    if (currentSessionToken && channelDataForTracking) {
        // Check if already tracked to change button text or behavior
        const isTracked = await checkIfChannelIsTracked(channelIdToTrack);
        if (isTracked) {
            showNotification(`${channelDataForTracking.snippet.title} is already in your dashboard.`, 'info');
            // Optionally disable "add" or change text to "View in Dashboard"
        } else {
             // We can directly add it or prompt the user. For now, let's add a specific button or modify existing.
             // For simplicity, we'll assume the main "Track" button's purpose shifts if logged in.
             // The actual "add to dashboard" action will be triggered by a UI element handled by displayChannelInfo or a new button.
             // Let's assume displayChannelInfo will now show an "Add to Dashboard" button if logged in and not tracked.
             // For now, we'll just call the add function if the main button is clicked and user is logged in.
             // This part needs careful UI consideration.
             // A direct add after search might be too aggressive.
             // Let's refine this: the main search form's "Track" button will primarily display channel info.
             // A *new* button within the displayed channel info (handled by ui.js) will be "Add to Dashboard".
             // So, the logic here is mostly for displaying. The actual "add" will be from an event listener set up in ui.js
        }
    }

  } else {
    pushSearchState(); // For browser history
    // searchAndSelectChannel will handle displaying channel options.
    // We need to modify searchAndSelectChannel to also offer "Add to Dashboard" for each result if logged in.
    await searchAndSelectChannel(input, true /* isSearchContextForDashboard */); 
  }
});

// Modify searchAndSelectChannel to handle adding to dashboard
async function searchAndSelectChannel(input, isSearchContextForDashboard = false) {
    const status = document.getElementById('statusMessage');
    status.textContent = 'Searching for channels...';
    // Remove redeclaration of searchUrl, res, data, channelIds, statsUrl, statsRes, statsData, sorted, channelInfoContainer, status
    // Only declare them once at the top of the function, and reuse for both code paths
    const searchUrl = `http://localhost:3000/api/youtube?endpoint=search&part=snippet&type=channel&q=${encodeURIComponent(input)}&maxResults=10`;
    const res = await fetch(searchUrl);
    const data = await res.json();
    if (!data.items || data.items.length === 0) {
        status.textContent = 'No channels found with that name.';
        return;
    }
    const channelIds = data.items.map(item => item.snippet.channelId).join(',');
    const statsUrl = `http://localhost:3000/api/youtube?endpoint=channels&part=snippet,statistics&id=${channelIds}`;
    const statsRes = await fetch(statsUrl);
    const statsData = await statsRes.json();
    const sorted = statsData.items.sort((a, b) => parseInt(b.statistics.subscriberCount||0) - parseInt(a.statistics.subscriberCount||0));
    const channelInfoContainer = document.getElementById('channelInfo'); // Ensure this is the correct container
    channelInfoContainer.innerHTML = `<h3 style="text-align:left;margin-left:32px;">Select a channel:</h3>` +
    sorted.map(ch => {
      let addButtonHtml = '';
      if (currentSessionToken && isSearchContextForDashboard) {
          addButtonHtml = `<button class="add-to-dashboard-search-btn" data-channel-id="${ch.id}" data-channel-name="${ch.snippet.title}">Add to Dashboard</button>`;
      }
      return `
        <div class="channel-card selectable-channel" data-channel-id="${ch.id}" data-channel-name="${ch.snippet.title}">
          <img src="${ch.snippet.thumbnails.medium.url}" class="channel-avatar" alt="${ch.snippet.title}">
          <div class="channel-details">
            <h2>${ch.snippet.title}</h2>
            <p>Subscribers: ${formatNumber(parseInt(ch.statistics.subscriberCount || 0))}</p>
            <p>Videos: ${formatNumber(parseInt(ch.statistics.videoCount || 0))}</p>
            <p>${ch.snippet.description.substring(0, 100)}...</p>
            ${addButtonHtml}
          </div>
        </div>
      `;
    }).join('');
    status.textContent = '';
    document.querySelectorAll('.add-to-dashboard-search-btn').forEach(button => {
        button.addEventListener('click', async function(event) {
            event.stopPropagation();
            const channelId = this.dataset.channelId;
            const channelName = this.dataset.channelName;
            await handleAddTrackedChannel(channelId, channelName);
        });
    });
    document.querySelectorAll('.selectable-channel').forEach(card => {
        card.addEventListener('click', async function() {
            const channelId = this.getAttribute('data-channel-id');
            const channelName = this.getAttribute('data-channel-name');
            status.textContent = 'Loading channel...';
            const channelData = await fetchChannelData(channelId);
            displayChannelInfo(channelData, currentSessionToken, () => handleAddTrackedChannel(channelId, channelName));
            renderEarningsUI();
            setupEarningsEvents(parseInt(channelData.statistics.viewCount || 0));
            const videos = await fetchRecentVideos(channelId);
            displayVideos(videos, true);
            analyzeChannelTrendsWithAI(channelId, videos, channelData);
            status.textContent = '';
        });
    });
}

async function checkIfChannelIsTracked(channelId) {
    if (!currentSessionToken) return false;
    try {
        const trackedChannels = await fetchTrackedChannels(currentSessionToken);
        return trackedChannels.some(ch => ch.channelId === channelId);
    } catch {
        return false; // If error, assume not tracked
    }
}

// Add event listener for the Sign In button to trigger Google OAuth logic
window.addEventListener('DOMContentLoaded', () => {
  const signInBtn = document.getElementById('signInBtn');
  const googleSignInModal = document.getElementById('googleSignInModal');
  const closeGoogleSignInModal = document.getElementById('closeGoogleSignInModal');
  if (signInBtn && googleSignInModal) {
    signInBtn.addEventListener('click', () => {
      googleSignInModal.style.display = 'flex';
    });
  }
  if (closeGoogleSignInModal && googleSignInModal) {
    closeGoogleSignInModal.addEventListener('click', () => {
      googleSignInModal.style.display = 'none';
    });
  }
});

// --- Dark Mode Toggle ---
document.getElementById('darkModeToggle').onclick = function() {
  document.body.classList.toggle('dark-mode');
  localStorage.setItem('yt_dark_mode', document.body.classList.contains('dark-mode') ? '1' : '0');
  this.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
};
if (localStorage.getItem('yt_dark_mode') === '1') {
  document.body.classList.add('dark-mode');
  document.getElementById('darkModeToggle').textContent = '☀️';
}

// --- Onboarding Modal ---
window.addEventListener('DOMContentLoaded', () => {
  if (!localStorage.getItem('yt_onboarded')) {
    document.getElementById('onboardingModal').style.display = 'flex';
  }
  document.getElementById('closeOnboarding').onclick = closeOnboarding;
  document.getElementById('closeOnboardingBtn').onclick = closeOnboarding;
  function closeOnboarding() {
    document.getElementById('onboardingModal').style.display = 'none';
    localStorage.setItem('yt_onboarded', '1');
  }
  fetchAndDisplayGlobalTrends(); // Existing

  // Initialize Google Sign In
  // Delay initialization slightly to ensure Google API script is loaded
  setTimeout(initializeGoogleSignIn, 500); 


  if (logoutButton) {
    logoutButton.addEventListener('click', handleLogout);
  }
  if (closeGraphModalBtn) {
    closeGraphModalBtn.addEventListener('click', function() {
      document.getElementById('growthGraphModal').style.display = 'none';
    });
  }
  
  // Load tracked channels if user is already logged in (e.g. from previous session)
  if (currentSessionToken && currentUser) {
      loadTrackedChannels();
  }
});

window.onload = function() {
    initializeGoogleSignIn();
    // Other initializations that depend on full page load can also go here.
};

// --- Browser History Integration ---
function pushChannelState(channelId) {
  if (!history.state || history.state.channelId !== channelId) {
    history.pushState({ channelId }, '', '');
  }
}
function pushSearchState() {
  if (!history.state || !history.state.search) {
    history.pushState({ search: true }, '', '');
  }
}
window.onpopstate = function(event) {
  if (event.state && event.state.channelId) {
    fetchChannelData(event.state.channelId).then(channelData => {
      displayChannelInfo(channelData);
      renderEarningsUI();
      setupEarningsEvents(parseInt(channelData.statistics.viewCount || 0));
      fetchRecentVideos(event.state.channelId).then(videos => {
        displayVideos(videos, true);
        analyzeChannelTrendsWithAI(event.state.channelId, videos, channelData);
      });
    });
  } else {
    document.getElementById('channelInfo').innerHTML = '';
    document.getElementById('videosContainer').innerHTML = '';
    document.getElementById('statusMessage').textContent = '';
    document.getElementById('channelInput').value = '';
    document.getElementById('channelInput').focus();
  }
};

// Manual Earnings Calculator Modal Logic
const manualCalculatorBtn = document.getElementById('manualCalculatorBtn');
const manualCalculatorModal = document.getElementById('manualCalculatorModal');
const closeCalculatorModal = document.getElementById('closeCalculatorModal');
const calculateEarningsBtn = document.getElementById('calculateEarningsBtn');
const calculatorResults = document.getElementById('calculatorResults');

if (manualCalculatorBtn && manualCalculatorModal) {
  manualCalculatorBtn.addEventListener('click', () => {
    manualCalculatorModal.style.display = 'block';
    calculatorResults.style.display = 'none';
    document.getElementById('earningsCalcForm').reset();
  });
}
if (closeCalculatorModal) {
  closeCalculatorModal.addEventListener('click', () => {
    manualCalculatorModal.style.display = 'none';
  });
}
window.addEventListener('click', (e) => {
  if (e.target === manualCalculatorModal) {
    manualCalculatorModal.style.display = 'none';
  }
});

if (calculateEarningsBtn) {
  calculateEarningsBtn.addEventListener('click', () => {
    const views = parseInt(document.getElementById('calcViews').value) || 0;
    const country = document.getElementById('calcCountry').value;
    const customCPM = parseFloat(document.getElementById('calcCPM').value);
    const cpm = CPM_TABLE[country] || CPM_TABLE['Unknown'];
    const minCPM = cpm.CPM_min;
    const maxCPM = cpm.CPM_max;
    const revenueShare = 0.55;
    // Conservative
    const conservative = ((views / 1000) * minCPM * revenueShare) || 0;
    // Optimistic
    const optimistic = ((views / 1000) * maxCPM * revenueShare) || 0;
    // Custom
    let custom = 0;
    if (!isNaN(customCPM) && customCPM > 0) {
      custom = ((views / 1000) * customCPM * revenueShare);
    }
    document.getElementById('conservativeEarnings').textContent = `$${conservative.toLocaleString(undefined, {maximumFractionDigits:2})}`;
    document.getElementById('optimisticEarnings').textContent = `$${optimistic.toLocaleString(undefined, {maximumFractionDigits:2})}`;
    document.getElementById('customEarnings').textContent = custom > 0 ? `$${custom.toLocaleString(undefined, {maximumFractionDigits:2})}` : 'N/A';
    calculatorResults.style.display = 'block';
  });
}

// Demo mode for static server - replace API calls with mock data
const DEMO_MODE = false; // Set to false when backend is available

// Mock data for demonstration
const MOCK_CHANNEL_DATA = {
  "MrBeast": {
    id: "UCX6OQ3DkcsbYNE6H8uQQuVA",
    title: "MrBeast",
    thumbnails: { default: { url: "https://yt3.ggpht.com/ytc/AIdro_kGrj-w8sKB_1eXXeYMJlpj2m1R5qOOj8hq6w=s88-c-k-c0x00ffffff-no-rj" }},
    statistics: { subscriberCount: "234000000", viewCount: "51234567890", videoCount: "819" }
  }
};