// utils/resendEmail.js
const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendOtpEmail(to, otp) {
  console.log("------------------------------------------");
  console.log("Resend Utility INVOKED");
  console.log("Attempting to send OTP via Resend...");
  console.log("To:", to);
  const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';
  console.log("From:", fromEmail);
  console.log("API Key Exists:", !!process.env.RESEND_API_KEY);

  try {
    const data = await resend.emails.send({
      from: fromEmail,
      to,
      subject: "Royal Shield OTP Code",
      html: `
      <div style="font-family:Arial,sans-serif">
        <h2>Your Royal Shield OTP</h2>
        <p>Use this code to verify branch access:</p>
        <div style="font-size:28px;font-weight:bold;letter-spacing:4px; margin: 20px 0;">${otp}</div>
        <p style="color:#666">If you didn’t request this, ignore this email.</p>
      </div>
    `,
    });
    console.log("Resend API SUCCESS Response:", JSON.stringify(data, null, 2));
    console.log("------------------------------------------");
    return data;
  } catch (error) {
    console.error("Resend API ERROR:", error);
    console.log("------------------------------------------");
    throw error;
  }
}

module.exports = { sendOtpEmail };
