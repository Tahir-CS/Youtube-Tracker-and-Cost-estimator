# YouTube Tracker

## Overview
YouTube Tracker is a web application designed to help users track YouTube channel statistics, set alerts for milestones, and analyze global trends using AI. The app integrates Google Sign-In for authentication and uses the YouTube Data API and Gemini AI for data processing.

## Features
- **Google Sign-In**: Secure authentication using Google accounts.
- **Channel Tracking**: Add, remove, and view tracked YouTube channels.
- **Alerts**: Set milestone or growth percentage alerts for tracked channels.
- **Global Trends Analysis**: Analyze trending YouTube videos using AI.
- **Email Notifications**: Receive alerts via email.

## Folder Structure
```
YOUTUBE TRACKER/
├── ai.js
├── api.js
├── backend.js
├── charts.js
├── city_coordinates.csv
├── compare.js
├── db_mock.js
├── google-signin-custom.css
├── index.html
├── main.js
├── master.css
├── package.json
├── railway.json
├── ui.js
├── utils.js
├── .env
├── .gitignore
├── README.md
```

## Setup

### Prerequisites
- Node.js and npm installed
- Railway CLI (optional, for deployment)

### Installation
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd YOUTUBE TRACKER
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Environment Variables
Create a `.env` file in the root directory with the following variables:
```
GOOGLE_CLIENT_ID=<your-google-client-id>
JWT_SECRET=<your-jwt-secret>
GEMINI_API_KEY=<your-gemini-api-key>
YOUTUBE_API_KEY=<your-youtube-api-key>
EMAIL_HOST=<your-email-host>
EMAIL_PORT=<your-email-port>
EMAIL_USER=<your-email-username>
EMAIL_PASS=<your-email-password>
RAILWAY_STATIC_URL=<your-railway-static-url>
PORT=<your-port>
```

### Running Locally
Start the server:
```bash
npm start
```
Access the app at `http://localhost:3001`.

## Deployment

### Railway Deployment
1. Install Railway CLI:
   ```bash
   npm install -g railway
   ```
2. Link the project:
   ```bash
   railway link
   ```
3. Set environment variables using the Railway dashboard.
4. Deploy the app:
   ```bash
   railway up
   ```

## Usage
- Sign in using your Google account.
- Add YouTube channels to track their statistics.
- Set alerts for milestones or growth percentages.
- View global trends analyzed by AI.

## Contributing
Feel free to submit issues or pull requests to improve the app.

## License
This project is licensed under the MIT License.

## Ignored Files

The following files and folders are ignored in version control:

```
node_modules/  # Installed dependencies
.env           # Local environment variables
```
