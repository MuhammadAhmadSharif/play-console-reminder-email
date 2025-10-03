
import express from 'express';
import nodemailer from 'nodemailer';
import cron from 'node-cron';

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// CONFIGURATION WITH VALIDATION
// ============================================

function parseTesters() {
  try {
    const testersString = process.env.TESTERS || '[]';
    return JSON.parse(testersString);
  } catch (error) {
    console.error('Error parsing TESTERS environment variable:', error.message);
    return [];
  }
}

function parseDate(dateString) {
  try {
    return new Date(dateString);
  } catch (error) {
    console.error('Error parsing START_DATE:', error.message);
    return new Date();
  }
}

const CONFIG = {
  TOTAL_DAYS: parseInt(process.env.TOTAL_DAYS || '14'),
  REMINDER_TIME: process.env.REMINDER_TIME || '09:00',
  TIMEZONE: process.env.TIMEZONE || 'Asia/Karachi',
  
  EMAIL_FROM: process.env.EMAIL_FROM || '',
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD || '',
  EMAIL_SERVICE: process.env.EMAIL_SERVICE || 'gmail',
  
  TESTERS: parseTesters(),
  
  APP_NAME: process.env.APP_NAME || 'Your App',
  APP_VERSION: process.env.APP_VERSION || '1.0.0',
  PLAY_CONSOLE_LINK: process.env.PLAY_CONSOLE_LINK || '',
  
  START_DATE: parseDate(process.env.START_DATE || '2025-10-04'),
  
  API_SECRET: process.env.API_SECRET || 'default-secret',
};

// Validate critical configuration
function validateConfig() {
  const errors = [];
  
  if (!CONFIG.EMAIL_FROM) {
    errors.push('EMAIL_FROM is required');
  }
  
  if (!CONFIG.EMAIL_PASSWORD) {
    errors.push('EMAIL_PASSWORD is required');
  }
  
  if (CONFIG.TESTERS.length === 0) {
    errors.push('TESTERS array is empty. Add at least one tester.');
  }
  
  if (errors.length > 0) {
    console.error('\n❌ Configuration Errors:');
    errors.forEach(err => console.error(`   - ${err}`));
    console.error('\n⚠️  The app will start but emails will not be sent until configuration is fixed.\n');
  }
  
  return errors.length === 0;
}

const isConfigValid = validateConfig();

// ============================================
// EMAIL TRANSPORTER SETUP
// ============================================

let transporter = null;

if (isConfigValid) {
  try {
    transporter = nodemailer.createTransport({
      service: CONFIG.EMAIL_SERVICE,
      auth: {
        user: CONFIG.EMAIL_FROM,
        pass: CONFIG.EMAIL_PASSWORD,
      },
    });
    console.log('✅ Email transporter configured');
  } catch (error) {
    console.error('❌ Failed to create email transporter:', error.message);
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getCurrentDay() {
  const today = new Date();
  const startDate = new Date(CONFIG.START_DATE);
  const diffTime = today - startDate;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
}

function shouldSendReminder() {
  const currentDay = getCurrentDay();
  return currentDay >= 1 && currentDay <= CONFIG.TOTAL_DAYS;
}

function generateEmailHTML(testerName, dayNumber) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .progress { background: #e0e0e0; height: 30px; border-radius: 15px; overflow: hidden; margin: 20px 0; }
        .progress-bar { background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
        .checklist { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .checklist-item { padding: 8px 0; border-bottom: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎯 Testing Reminder - Day ${dayNumber}/${CONFIG.TOTAL_DAYS}</h1>
        </div>
        <div class="content">
          <p>Hi <strong>${testerName}</strong>,</p>
          
          <p>This is your daily reminder to test <strong>${CONFIG.APP_NAME} (v${CONFIG.APP_VERSION})</strong> on Google Play Console.</p>
          
          <div class="progress">
            <div class="progress-bar" style="width: ${(dayNumber / CONFIG.TOTAL_DAYS) * 100}%">
              ${Math.round((dayNumber / CONFIG.TOTAL_DAYS) * 100)}% Complete
            </div>
          </div>
          
          <div class="checklist">
            <h3>📋 Today's Testing Checklist:</h3>
            <div class="checklist-item">✓ Launch the app and check for crashes</div>
            <div class="checklist-item">✓ Test core features and functionality</div>
            <div class="checklist-item">✓ Check UI responsiveness and layout</div>
            <div class="checklist-item">✓ Report any bugs or issues found</div>
            <div class="checklist-item">✓ Provide feedback on user experience</div>
          </div>
          
          <center>
            <a href="${CONFIG.PLAY_CONSOLE_LINK}" class="button">Open Play Console Testing</a>
          </center>
          
          <p><strong>Days Remaining:</strong> ${CONFIG.TOTAL_DAYS - dayNumber} days</p>
          
          <p>Thank you for your valuable contribution to making our app better! 🚀</p>
          
          <p>Best regards,<br>The Development Team</p>
        </div>
        <div class="footer">
          <p>This is an automated reminder. Testing campaign runs from Day 1 to Day ${CONFIG.TOTAL_DAYS}.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// ============================================
// SEND REMINDERS FUNCTION
// ============================================

async function sendReminders() {
  console.log('\n=== Checking if reminders should be sent ===');
  
  if (!isConfigValid) {
    return {
      message: 'Configuration is invalid. Check server logs.',
      status: 'error'
    };
  }
  
  if (!transporter) {
    return {
      message: 'Email transporter not configured',
      status: 'error'
    };
  }
  
  if (!shouldSendReminder()) {
    const currentDay = getCurrentDay();
    console.log(`Skipped: Current day is ${currentDay}, testing period: 1-${CONFIG.TOTAL_DAYS}`);
    return {
      message: 'Testing period is over or has not started yet',
      currentDay,
      totalDays: CONFIG.TOTAL_DAYS,
      status: 'skipped'
    };
  }

  const currentDay = getCurrentDay();
  console.log(`Sending reminders for Day ${currentDay}/${CONFIG.TOTAL_DAYS}`);
  
  const results = [];

  for (const tester of CONFIG.TESTERS) {
    const mailOptions = {
      from: `"App Testing Team" <${CONFIG.EMAIL_FROM}>`,
      to: tester.email,
      subject: `[Day ${currentDay}/${CONFIG.TOTAL_DAYS}] Testing Reminder - ${CONFIG.APP_NAME}`,
      html: generateEmailHTML(tester.name, currentDay),
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`✓ Email sent to ${tester.name} (${tester.email})`);
      results.push({
        tester: tester.name,
        email: tester.email,
        status: 'sent',
      });
    } catch (error) {
      console.error(`✗ Failed to send email to ${tester.email}:`, error.message);
      results.push({
        tester: tester.name,
        email: tester.email,
        status: 'failed',
        error: error.message,
      });
    }
  }

  console.log('=== Reminder batch completed ===\n');
  
  return {
    message: 'Reminders processed',
    day: currentDay,
    totalDays: CONFIG.TOTAL_DAYS,
    results,
  };
}

// ============================================
// EXPRESS ROUTES
// ============================================

app.get('/', (req, res) => {
  res.json({
    status: 'running',
    service: 'Play Console Testing Reminder',
    configured: isConfigValid,
    currentDay: getCurrentDay(),
    totalDays: CONFIG.TOTAL_DAYS,
    reminderTime: CONFIG.REMINDER_TIME,
    timezone: CONFIG.TIMEZONE,
    testersCount: CONFIG.TESTERS.length,
    emailConfigured: !!transporter,
  });
});

app.get('/trigger', async (req, res) => {
  const apiSecret = req.headers['x-api-secret'] || req.query.secret;
  
  if (apiSecret !== CONFIG.API_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await sendReminders();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to send reminders',
      message: error.message,
    });
  }
});

app.get('/status', (req, res) => {
  const currentDay = getCurrentDay();
  const isActive = shouldSendReminder();
  
  res.json({
    active: isActive,
    configured: isConfigValid,
    currentDay,
    totalDays: CONFIG.TOTAL_DAYS,
    daysRemaining: Math.max(0, CONFIG.TOTAL_DAYS - currentDay),
    startDate: CONFIG.START_DATE.toISOString(),
    appName: CONFIG.APP_NAME,
    testersCount: CONFIG.TESTERS.length,
    emailFrom: CONFIG.EMAIL_FROM ? CONFIG.EMAIL_FROM : 'Not configured',
  });
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// ============================================
// CRON JOB SETUP
// ============================================

const [hour, minute] = CONFIG.REMINDER_TIME.split(':');
const cronSchedule = `${minute} ${hour} * * *`;

console.log(`
╔════════════════════════════════════════════════╗
║   Play Console Testing Reminder System        ║
╚════════════════════════════════════════════════╝

📅 Testing Period: ${CONFIG.TOTAL_DAYS} days
⏰ Reminder Time: ${CONFIG.REMINDER_TIME} (${CONFIG.TIMEZONE})
👥 Testers: ${CONFIG.TESTERS.length}
📱 App: ${CONFIG.APP_NAME} v${CONFIG.APP_VERSION}
🔔 Cron Schedule: ${cronSchedule}
🌐 Server Port: ${PORT}
✉️  Email From: ${CONFIG.EMAIL_FROM || 'NOT SET'}
🔧 Config Valid: ${isConfigValid ? 'YES' : 'NO'}
`);

if (isConfigValid) {
  cron.schedule(cronSchedule, async () => {
    console.log(`\n[${new Date().toISOString()}] Cron job triggered`);
    try {
      await sendReminders();
    } catch (error) {
      console.error('Cron job error:', error.message);
    }
  }, {
    timezone: CONFIG.TIMEZONE
  });
  console.log('✅ Cron job scheduled successfully\n');
} else {
  console.log('⚠️  Cron job NOT scheduled due to configuration errors\n');
}

// ============================================
// ERROR HANDLING
// ============================================

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/`);
  console.log(`🔄 Manual trigger: http://localhost:${PORT}/trigger?secret=${CONFIG.API_SECRET}`);
  console.log(`📈 Status: http://localhost:${PORT}/status`);
  console.log(`💚 Health: http://localhost:${PORT}/health\n`);
});