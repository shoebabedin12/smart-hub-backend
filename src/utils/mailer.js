const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 465,
  secure: process.env.SMTP_SECURE !== 'false',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

exports.sendOtpEmail = async (to, fullName, otp) => {
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: 'Verify your Smart Hub account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
        <h2 style="color: #16a34a; margin-bottom: 4px;">Smart Hub</h2>
        <p>Hi ${fullName || 'there'},</p>
        <p>Use the code below to verify your email and activate your account. This code expires in 10 minutes.</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; background: #f1f5f9; border-radius: 12px; padding: 16px; margin: 20px 0;">
          ${otp}
        </div>
        <p style="color: #64748b; font-size: 12px;">If you didn't create this account, you can safely ignore this email.</p>
      </div>
    `,
  });
};
