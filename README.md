# Play Console Testing Reminder System

A web-based application that automatically sends daily email reminders to Play Console testers.

## 🌟 Features

- **Web-Based Configuration**: Easy-to-use UI for setting up the reminder system
- **Automated Daily Reminders**: Scheduled emails sent via cron jobs
- **Progress Tracking**: Visual dashboard showing testing campaign progress
- **Multiple Testers**: Support for unlimited testers
- **Test Email**: Send test emails before starting the campaign
- **Manual Trigger**: Send reminders on-demand
- **Beautiful Email Templates**: Professional HTML emails with progress bars

## 📋 Prerequisites

- Node.js 18+ installed
- Gmail account with App Password (or other email service)
- Render account (for deployment)

## 🔧 Setup Gmail App Password

1. Go to your Google Account settings
2. Enable 2-Factor Authentication
3. Go to **Security** → **2-Step Verification** → **App passwords**
4. Generate an app password for "Mail"
5. Use this password in the application (not your regular Gmail password)

## 🚀 Local Development

1. **Clone/Create Project Structure:**

```
project/
├── server.js
├── package.json
└── public/
    └── index.html
```

2. **Install Dependencies:**

```bash
npm install
```

3. **Start the Server:**

```bash
npm start
```

4. **Open Browser:**

Navigate to `http://localhost:3000`

## 📦 Deployment on Render

### Step 1: Prepare Your Repository

1. Create a GitHub repository
2. Upload these files:
   - `server.js`
   - `package.json`
   - `public/index.html`

### Step 2: Deploy on Render

1. Go to [render.com](https://render.com)
2. Click **New** → **Web Service**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `play-console-reminder`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

5. Click **Create Web Service**

### Step 3: Configure the Application

1. Once deployed, open your Render URL (e.g., `https://your-app.onrender.com`)
2. Fill in the configuration form:
   - **App Name**: Your app name
   - **App Version**: Version number (e.g., 1.0.0)
   - **Play Console Link**: Your testing link
   - **Email From**: Your Gmail address
   - **Email Password**: Your Gmail App Password
   - **Email Service**: Gmail (or your email provider)
   - **Reminder Time**: Time to send daily reminders (24h format)
   - **Timezone**: Your timezone
   - **Total Days**: Duration of testing period (e.g., 14)
   - **Start Date**: Campaign start date
   - **Testers**: Add all tester names and emails

3. Click **Start Reminder System**

## 🎯 Using the System

### Dashboard Features

- **Current Status Card**: Shows testing progress and statistics
- **Send Now**: Manually trigger reminder emails
- **Test Email**: Send a test email to verify configuration
- **Stop System**: Stop the automated reminders
- **Refresh Status**: Update the dashboard

### API Endpoints

- `GET /` - Web dashboard
- `GET /api/status` - Get current system status
- `POST /api/configure` - Configure the reminder system
- `POST /api/trigger` - Manually send reminders
- `POST /api/test-email` - Send test email
- `POST /api/stop` - Stop the system
- `GET /api/health` - Health check

## 📧 Email Template

The system sends beautiful HTML emails with:
- Progress bar showing campaign completion
- Testing checklist
- Days remaining counter
- Direct link to Play Console
- Professional styling

## 🔒 Security Notes

- Never commit your email password to version control
- Use environment variables in production
- Keep your App Password secure
- Use HTTPS in production (Render provides this automatically)

## ⚙️ Configuration Options

| Field | Description | Required | Default |
|-------|-------------|----------|---------|
| App Name | Name of your application | Yes | - |
| App Version | Version number | No | 1.0.0 |
| Play Console Link | Testing page URL | No | - |
| Email From | Sender email address | Yes | - |
| Email Password | Email app password | Yes | - |
| Email Service | Email provider | No | gmail |
| Reminder Time | Daily send time (24h) | Yes | 09:00 |
| Timezone | Timezone for scheduling | No | Asia/Karachi |
| Total Days | Campaign duration | Yes | 14 |
| Start Date | Campaign start date | Yes | Today |
| Testers | List of tester details | Yes | - |

## 🐛 Troubleshooting

### Emails Not Sending

1. Verify Gmail App Password is correct
2. Check that 2FA is enabled on Gmail
3. Ensure email service is correctly selected
4. Test with the "Test Email" button

### Cron Job Not Running

1. Check if the current day is within the testing period
2. Verify timezone is set correctly
3. Check Render logs for errors

### Configuration Errors

1. Ensure all required fields are filled
2. Check email format for all testers
3. Verify date format (YYYY-MM-DD)
4. Ensure time format is HH:MM (24-hour)

## 📊 Monitoring

- Check Render logs for cron job execution
- Use the status dashboard to monitor progress
- Review email delivery results in the API response

## 🆘 Support

For issues or questions:
1. Check the Render logs
2. Verify your configuration
3. Test with a single tester first
4. Use the health endpoint to verify server status

## 📝 License

MIT License - Feel free to modify and use as needed.

## 🎉 Credits

Built for automating Play Console testing campaigns with ease!