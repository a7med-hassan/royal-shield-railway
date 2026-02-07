// utils/resendEmail.js
const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendOtpEmail(to, otp) {
    // Ensure 'to' is an array or string as needed. Resend handles arrays.
    return resend.emails.send({
        from: process.env.FROM_EMAIL || 'onboarding@resend.dev', // Fallback for safety
        to,
        subject: "OTP Code",
        html: `
      <div style="font-family:Arial,sans-serif">
        <h2>Your OTP Code</h2>
        <p>Use this code to continue:</p>
        <div style="font-size:28px;font-weight:bold;letter-spacing:4px">${otp}</div>
        <p style="color:#666">If you didn’t request this, ignore this email.</p>
      </div>
    `,
    });
}

module.exports = { sendOtpEmail };
