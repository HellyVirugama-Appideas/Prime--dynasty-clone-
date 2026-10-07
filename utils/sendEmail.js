const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

async function sendVerificationEmail(toEmail, driverName, verifyUrl) {
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
            <h2 style="color: #11998e;">Verify Your Email</h2>
            <p>Hi ${driverName || 'Driver'},</p>
            <p>Thanks for signing up as a driver. Please verify your email address to continue with your account approval process.</p>
            <a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#11998e;color:#fff;text-decoration:none;border-radius:6px;margin:16px 0;">
                Verify Email
            </a>
            <p style="color:#888;font-size:13px;">This link will expire in 24 hours. If you did not sign up, you can ignore this email.</p>
        </div>
    `;

    await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: toEmail,
        subject: 'Verify Your Email Address',
        html,
    });
}

module.exports = { sendVerificationEmail };