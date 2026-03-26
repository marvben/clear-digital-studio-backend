const express = require('express');
const nodemailer = require('nodemailer');
const axios = require('axios');
const router = express.Router();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function verifyRecaptcha(token) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) return { success: true, score: 1 };

  const { data } = await axios.post('https://www.google.com/recaptcha/api/siteverify', `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(token)}`, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return data;
}

router.post('/', async (req, res) => {
  try {
    const { name, email, business, phone, projectType, budget, message, recaptchaToken, website } = req.body;

    // Honeypot check — hidden field should be empty
    if (website) {
      // Bot filled the honeypot — return success silently
      return res.status(200).json({ success: true, message: 'Message received.' });
    }

    // Validate required fields
    const errors = [];
    if (!name || !name.trim()) errors.push('Name is required');
    if (!email || !email.trim()) errors.push('Email is required');
    if (!business || !business.trim()) errors.push('Business name is required');
    if (!message || !message.trim()) errors.push('Message is required');
    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    // reCAPTCHA verification (skip if no token — don't block real users)
    if (process.env.RECAPTCHA_SECRET_KEY && recaptchaToken) {
      const captchaResult = await verifyRecaptcha(recaptchaToken);
      if (!captchaResult.success || (captchaResult.score && captchaResult.score < 0.5)) {
        return res.status(400).json({ success: false, errors: ['Spam detected. Please try again.'] });
      }
    }

    // Build email
    const toEmail = process.env.CONTACT_TO_EMAIL || 'hello@cleardigitalstudio.ca';
    const htmlBody = `
      <h2>New Contact Form Submission</h2>
      <table style="border-collapse:collapse;width:100%;max-width:600px;">
        <tr><td style="padding:8px 12px;font-weight:bold;border-bottom:1px solid #eee;">Name</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(name)}</td></tr>
        <tr><td style="padding:8px 12px;font-weight:bold;border-bottom:1px solid #eee;">Email</td><td style="padding:8px 12px;border-bottom:1px solid #eee;"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
        <tr><td style="padding:8px 12px;font-weight:bold;border-bottom:1px solid #eee;">Business</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(business)}</td></tr>
        <tr><td style="padding:8px 12px;font-weight:bold;border-bottom:1px solid #eee;">Phone</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(phone || 'N/A')}</td></tr>
        <tr><td style="padding:8px 12px;font-weight:bold;border-bottom:1px solid #eee;">Project Type</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(projectType || 'N/A')}</td></tr>
        <tr><td style="padding:8px 12px;font-weight:bold;border-bottom:1px solid #eee;">Budget</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(budget || 'N/A')}</td></tr>
        <tr><td style="padding:8px 12px;font-weight:bold;border-bottom:1px solid #eee;">Message</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(message).replace(/\n/g, '<br>')}</td></tr>
      </table>
      <p style="margin-top:16px;color:#999;font-size:12px;">Sent from cleardigitalstudio.ca contact form at ${new Date().toISOString()}</p>
    `;

    // Send email if SMTP is configured
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      await transporter.sendMail({
        from: `"Clear Digital Studio" <${process.env.SMTP_USER}>`,
        replyTo: email,
        to: toEmail,
        subject: `New inquiry from ${name} — ${business}`,
        html: htmlBody,
      });
    } else {
      console.log('--- New Contact Submission (SMTP not configured) ---');
      console.log({ name, email, business, phone, projectType, budget, message });
      console.log('Received at:', new Date().toISOString());
      console.log('---------------------------------------------------');
    }

    res.status(200).json({ success: true, message: "Message received. We'll be in touch." });
  } catch (err) {
    console.error('Contact form error:', err);
    res.status(500).json({ success: false, errors: ['Something went wrong. Please try again.'] });
  }
});

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

module.exports = router;
