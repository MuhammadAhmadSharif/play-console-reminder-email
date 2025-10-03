import express from 'express';
import nodemailer from 'nodemailer';
import cron from 'node-cron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));

// Add request logging for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// In-memory storage (in production, use a database)
let activeConfig = null;
let transporter = null;
let scheduledJob = null;

// ============================================
// HELPER FUNCTIONS
// ============================================

function getCurrentDay(startDate) {
  const today = new Date();
  const start = new Date(startDate);
  const diffTime = today - start;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
}

function shouldSendReminder(startDate, totalDays) {
  const currentDay = getCurrentDay(startDate);
  return currentDay >= 1 && currentDay <= totalDays;
}

function generateEmailHTML(testerName, dayNumber, config) {
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
          <h1>🎯 Testing Reminder - Day ${dayNumber}/${config.totalDays}</h1>
        </div>
        <div class="content">
          <p>Hi <strong>${testerName}</strong>,</p>
          
          <p>This is your daily reminder to test <strong>${config.appName} (v${config.appVersion})</strong> on Google Play Console.</p>
          
          <div class="progress">
            <div class="progress-bar" style="width: ${(dayNumber / config.totalDays) * 100}%">
              ${Math.round((dayNumber / config.totalDays) * 100)}% Complete
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
            <a href="${config.playConsoleLink}" class="button">Open Play Console Testing</a>
          </center>
          
          <p><strong>Days Remaining:</strong> ${config.totalDays - dayNumber} days</p>
          
          <p>Thank you for your valuable contribution to making our app better! 🚀</p>
          
          <p>Best regards,<br>The Development Team</p>
        </div>
        <div class="footer">
          <p>This is an automated reminder. Testing campaign runs from Day 1 to Day ${config.totalDays}.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

async function sendReminders() {
  if (!activeConfig || !transporter) {
    return { success: false, message: 'No active configuration' };
  }

  if (!shouldSendReminder(activeConfig.startDate, activeConfig.totalDays)) {
    const currentDay = getCurrentDay(activeConfig.startDate);
    return {
      success: false,
      message: 'Testing period is over or has not started yet',
      currentDay,
      totalDays: activeConfig.totalDays
    };
  }

  const currentDay = getCurrentDay(activeConfig.startDate);
  const results = [];

  for (const tester of activeConfig.testers) {
    const mailOptions = {
      from: `"App Testing Team" <${activeConfig.emailFrom}>`,
      to: tester.email,
      subject: `[Day ${currentDay}/${activeConfig.totalDays}] Testing Reminder - ${activeConfig.appName}`,
      html: generateEmailHTML(tester.name, currentDay, activeConfig),
    };

    try {
      await transporter.sendMail(mailOptions);
      results.push({
        tester: tester.name,
        email: tester.email,
        status: 'sent',
      });
    } catch (error) {
      results.push({
        tester: tester.name,
        email: tester.email,
        status: 'failed',
        error: error.message,
      });
    }
  }

  return {
    success: true,
    message: 'Reminders processed',
    day: currentDay,
    totalDays: activeConfig.totalDays,
    results,
  };
}

// ============================================
// API ROUTES
// ============================================

app.post('/api/configure', async (req, res) => {
  try {
    const {
      appName,
      appVersion,
      playConsoleLink,
      emailFrom,
      emailPassword,
      emailService,
      reminderTime,
      timezone,
      totalDays,
      startDate,
      testers
    } = req.body;

    // Validation
    if (!appName || !emailFrom || !emailPassword || !reminderTime || !testers || testers.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    // Create email transporter
    try {
      transporter = nodemailer.createTransport({
        service: emailService || 'gmail',
        auth: {
          user: emailFrom,
          pass: emailPassword,
        },
      });

      // Verify transporter
      await transporter.verify();
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Email configuration failed: ' + error.message
      });
    }

    // Store configuration
    activeConfig = {
      appName,
      appVersion: appVersion || '1.0.0',
      playConsoleLink: playConsoleLink || '',
      emailFrom,
      emailPassword,
      emailService: emailService || 'gmail',
      reminderTime,
      timezone: timezone || 'Asia/Karachi',
      totalDays: parseInt(totalDays) || 14,
      startDate: startDate || new Date().toISOString().split('T')[0],
      testers: testers.filter(t => t.name && t.email)
    };

    // Cancel existing cron job if any
    if (scheduledJob) {
      scheduledJob.stop();
    }

    // Schedule new cron job
    const [hour, minute] = reminderTime.split(':');
    const cronSchedule = `${minute} ${hour} * * *`;

    scheduledJob = cron.schedule(cronSchedule, async () => {
      console.log(`[${new Date().toISOString()}] Cron job triggered`);
      await sendReminders();
    }, {
      timezone: activeConfig.timezone
    });

    console.log('✅ Reminder system configured and scheduled');

    res.json({
      success: true,
      message: 'Reminder system configured successfully',
      config: {
        appName: activeConfig.appName,
        reminderTime: activeConfig.reminderTime,
        totalDays: activeConfig.totalDays,
        testersCount: activeConfig.testers.length,
        startDate: activeConfig.startDate
      }
    });

  } catch (error) {
    console.error('Configuration error:', error);
    res.status(500).json({
      success: false,
      message: 'Configuration failed: ' + error.message
    });
  }
});

app.get('/api/status', (req, res) => {
  if (!activeConfig) {
    return res.json({
      configured: false,
      message: 'No active configuration'
    });
  }

  const currentDay = getCurrentDay(activeConfig.startDate);
  const isActive = shouldSendReminder(activeConfig.startDate, activeConfig.totalDays);

  res.json({
    configured: true,
    active: isActive,
    currentDay,
    totalDays: activeConfig.totalDays,
    daysRemaining: Math.max(0, activeConfig.totalDays - currentDay),
    startDate: activeConfig.startDate,
    appName: activeConfig.appName,
    testersCount: activeConfig.testers.length,
    reminderTime: activeConfig.reminderTime,
    timezone: activeConfig.timezone
  });
});

app.post('/api/test-email', async (req, res) => {
  if (!activeConfig || !transporter) {
    return res.status(400).json({
      success: false,
      message: 'System not configured'
    });
  }

  try {
    const currentDay = getCurrentDay(activeConfig.startDate);
    const testEmail = req.body.email || activeConfig.testers[0]?.email;

    if (!testEmail) {
      return res.status(400).json({
        success: false,
        message: 'No test email provided'
      });
    }

    const mailOptions = {
      from: `"App Testing Team" <${activeConfig.emailFrom}>`,
      to: testEmail,
      subject: `[TEST] Testing Reminder - ${activeConfig.appName}`,
      html: generateEmailHTML('Test User', currentDay, activeConfig),
    };

    await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      message: `Test email sent to ${testEmail}`
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send test email: ' + error.message
    });
  }
});

app.post('/api/trigger', async (req, res) => {
  try {
    const result = await sendReminders();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send reminders: ' + error.message
    });
  }
});

app.post('/api/stop', (req, res) => {
  if (scheduledJob) {
    scheduledJob.stop();
    scheduledJob = null;
  }
  
  activeConfig = null;
  transporter = null;

  res.json({
    success: true,
    message: 'Reminder system stopped'
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

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
  console.log(`
╔════════════════════════════════════════════════╗
║   Play Console Testing Reminder System        ║
╚════════════════════════════════════════════════╝

🌐 Server running on port ${PORT}
📊 Dashboard: http://localhost:${PORT}/
💚 Health: http://localhost:${PORT}/api/health
  `);
});