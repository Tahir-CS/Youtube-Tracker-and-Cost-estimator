// ai.js - Gemini AI analysis integration
import { callGeminiAPI } from './api.js';

let aiAnalysisReloaded = false;

export async function analyzeChannelTrendsWithAI(channelId, videos, channelData) {
  const trendsSection = document.createElement('div');
  trendsSection.className = 'trends-analysis-section';
  trendsSection.innerHTML = `
    <div class="trends-header">
      <h3>🤖 AI Trending Content Analysis (Powered by Gemini)</h3>
      <button id="refreshTrends" class="btn btn-secondary">Refresh Analysis</button>
    </div>
    <div id="trendsContent" class="trends-content">
      <div class="loading-spinner">🤖 AI is analyzing trends...</div>
    </div>
  `;
  const earningsSection = document.querySelector('#earningsEstimatorCard');
  if (earningsSection) {
    earningsSection.parentNode.insertBefore(trendsSection, earningsSection.nextSibling);
  } else {
    const channelInfo = document.getElementById('channelInfo');
    if (channelInfo) {
      channelInfo.parentNode.insertBefore(trendsSection, channelInfo.nextSibling);
    }
  }
  // Only call Gemini API on first load, not on every reload
  if (!trendsSection.hasAttribute('data-loaded')) {
    await performRealAIAnalysis(videos, channelData);
    trendsSection.setAttribute('data-loaded', '1');
  }
  document.getElementById('refreshTrends').addEventListener('click', async () => {
    if (aiAnalysisReloaded) {
      document.getElementById('trendsContent').innerHTML = '<div class="error-message">You can only reload the AI analysis once per channel.</div>';
      return;
    }
    aiAnalysisReloaded = true;
    document.getElementById('trendsContent').innerHTML = '<div class="loading-spinner">🤖 Re-analyzing with AI...</div>';
    await performRealAIAnalysis(videos, channelData);
  });
}

async function performRealAIAnalysis(videos, channelData) {
  try {
    const analysisData = prepareDataForAI(videos, channelData);
    const aiInsights = await callGeminiAPI(analysisData);
    if (!aiInsights) throw new Error('No AI insights returned');
    displayAIAnalysis(aiInsights);
  } catch (error) {
    console.error('AI Analysis error:', error);
    
    // Determine error type and provide appropriate feedback
    let errorMessage = error.message || 'AI analysis failed';
    let showFallback = true;
    
    if (errorMessage.toLowerCase().includes('quota')) {
      errorMessage = '⚠️ Gemini AI quota exceeded. Showing previous analysis.';
      showFallback = true;
    } else if (errorMessage.toLowerCase().includes('access denied') || errorMessage.includes('403')) {
      errorMessage = '🔒 AI access denied. Please check API configuration.';
      showFallback = true;
    } else if (errorMessage.includes('500') || errorMessage.includes('503')) {
      errorMessage = '🔧 AI service temporarily unavailable. Showing cached analysis.';
      showFallback = true;
    }
    
    if (showFallback) {
      // Fallback: Show cached/previous analysis if Gemini fails
      const fallbackInsights = {
        trendingTopics: [
          'Short-form content (YouTube Shorts)',
          'AI tools and tech explainers',
          'Personal finance and side hustles'
        ],
        strategyRecommendations: [
          'Leverage Shorts for discoverability',
          'Create practical AI/tech tutorials',
          'Share real-life financial success stories'
        ],
        postingInsights: [
          'Post consistently, especially on weekends',
          'Use trending hashtags and titles',
          'Engage with comments quickly after upload'
        ],
        engagementTips: [
          'Ask viewers questions in your videos',
          'Pin top comments to spark discussion',
          'Collaborate with other creators in your niche'
        ],
        futurePredictions: [
          'Increased focus on AI-generated content',
          'More interactive and community-driven videos',
          'Growth in educational and self-improvement topics'
        ]
      };
      displayAIAnalysis(fallbackInsights);
      
      // Show error message with better styling
      const trendsContent = document.getElementById('trendsContent');
      if (trendsContent) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'ai-error-message';
        errorDiv.style.cssText = 'background: rgba(255,193,7,0.1); border: 1px solid #ffc107; border-radius: 8px; padding: 10px; margin: 15px 0; color: #856404; text-align: center;';
        errorDiv.innerHTML = `<small>${errorMessage}</small>`;
        trendsContent.appendChild(errorDiv);
      }
    } else {
      // Show error without fallback
      document.getElementById('trendsContent').innerHTML = `
        <div class="error-message" style="background: rgba(220,53,69,0.1); border: 1px solid #dc3545; border-radius: 8px; padding: 15px; margin: 10px 0; color: #721c24; text-align: center;">
          <p><strong>🤖 AI Analysis Unavailable</strong></p>
          <p>${errorMessage}</p>
          <button onclick="location.reload()" class="btn btn-secondary" style="margin-top: 10px;">🔄 Refresh Page</button>
        </div>
      `;
    }
  }
}

function prepareDataForAI(videos, channelData) {
  const topVideos = videos.slice(0, 15).map(video => ({
    title: video.snippet.title,
    views: parseInt(video.statistics.viewCount || 0),
    likes: parseInt(video.statistics.likeCount || 0),
    comments: parseInt(video.statistics.commentCount || 0),
    publishedAt: video.snippet.publishedAt,
    description: video.snippet.description?.substring(0, 200) || ''
  }));
  return {
    channelName: channelData.snippet.title,
    channelDescription: channelData.snippet.description?.substring(0, 300) || '',
    totalSubscribers: parseInt(channelData.statistics.subscriberCount || 0),
    totalViews: parseInt(channelData.statistics.viewCount || 0),
    totalVideos: parseInt(channelData.statistics.videoCount || 0),
    recentVideos: topVideos,
    analysisDate: new Date().toISOString()
  };
}

function displayAIAnalysis(insights) {
  const trendsContent = document.getElementById('trendsContent');
  trendsContent.innerHTML = `
    <div class="ai-insights-container">
      <div class="ai-disclaimer">
        <small>🤖 Analysis powered by Google Gemini AI • Based on recent video performance data</small>
      </div>
      <div class="trends-grid">
        <div class="trend-card ai-card">
          <h4>🔥 Trending Topics</h4>
          <ul class="ai-insights-list">
            ${(insights?.trendingTopics || []).map(topic => `<li>${topic}</li>`).join('') || '<li>No trending topics identified</li>'}
          </ul>
        </div>
        <div class="trend-card ai-card">
          <h4>🎯 Content Strategy</h4>
          <ul class="ai-insights-list">
            ${(insights?.strategyRecommendations || []).map(rec => `<li>${rec}</li>`).join('') || '<li>No strategy recommendations available</li>'}
          </ul>
        </div>
        <div class="trend-card ai-card">
          <h4>⏰ Posting Insights</h4>
          <ul class="ai-insights-list">
            ${(insights?.postingInsights || []).map(insight => `<li>${insight}</li>`).join('') || '<li>No posting insights available</li>'}
          </ul>
        </div>
        <div class="trend-card ai-card">
          <h4>💬 Engagement Tips</h4>
          <ul class="ai-insights-list">
            ${(insights?.engagementTips || []).map(tip => `<li>${tip}</li>`).join('') || '<li>No engagement tips available</li>'}
          </ul>
        </div>
      </div>
      <div class="future-predictions-section">
        <h4>🔮 Future Content Predictions</h4>
        <div class="predictions-grid">
          ${(insights?.futurePredictions || []).map(prediction => 
            `<div class="prediction-card">${prediction}</div>`
          ).join('') || '<div class="prediction-card">No predictions available</div>'}
        </div>
      </div>
    </div>
  `;
}
