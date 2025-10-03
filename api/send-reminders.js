// ==================================================
// FILE: api/send-reminders.js
// ==================================================

import nodemailer from 'nodemailer';

// ============================================
// CONFIGURATION - Use Environment Variables
// ============================================

const CONFIG = {
  TOTAL_DAYS: parseInt(process.env.TOTAL_DAYS || '14'),
  TIMEZONE: process.env.TIMEZONE || 'Asia/Karachi',
  
  // Email settings (from environment variables)
  EMAIL_FROM: process.env.EMAIL_FROM,
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
  
  // Tester details (stored as JSON string in env)
  TESTERS: JSON.parse(process.env.TESTERS || '[]'),
  
  // App details
  APP_NAME: process.env.APP_NAME || 'Your App',
  APP_VERSION: process.env.APP_VERSION || '1.0.0',
  PLAY_CONSOLE_LINK: process.env.PLAY_CONSOLE_LINK || '',
  
  // Campaign start date
  START_DATE: new Date(process.env.START_DATE || '2025-10-04'),
  
  // Cron secret for security
  CRON_SECRET: process.env.CRON_SECRET,
};

// ============================================
// EMAIL TRANSPORTER SETUP
// ============================================

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: CONFIG.EMAIL_FROM,
    pass: CONFIG.EMAIL_PASSWORD,
  },
});

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
// MAIN HANDLER FUNCTION
// ============================================

export default async function handler(req, res) {
  // Security: Verify the request is from Vercel Cron or has correct secret
  const authHeader = req.headers.authorization;
  
  if (CONFIG.CRON_SECRET && authHeader !== `Bearer ${CONFIG.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Check if it's time to send reminders
  if (!shouldSendReminder()) {
    const currentDay = getCurrentDay();
    return res.status(200).json({
      message: 'Testing period is over or has not started yet',
      currentDay,
      totalDays: CONFIG.TOTAL_DAYS,
      status: 'skipped'
    });
  }

  const currentDay = getCurrentDay();
  const results = [];

  // Send emails to all testers
  for (const tester of CONFIG.TESTERS) {
    const mailOptions = {
      from: `"App Testing Team" <${CONFIG.EMAIL_FROM}>`,
      to: tester.email,
      subject: `[Day ${currentDay}/${CONFIG.TOTAL_DAYS}] Testing Reminder - ${CONFIG.APP_NAME}`,
      html: generateEmailHTML(tester.name, currentDay),
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

  return res.status(200).json({
    message: 'Reminders processed',
    day: currentDay,
    totalDays: CONFIG.TOTAL_DAYS,
    results,
  });
}
