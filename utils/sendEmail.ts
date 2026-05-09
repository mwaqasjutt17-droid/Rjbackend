import nodemailer from "nodemailer";

interface MailOptions {
  email: string;
  subject: string;
  message: string; // HTML string
}

const sendEmail = async ({ email, subject, message }: MailOptions) => {
  if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
    throw new Error("SMTP credentials are not configured in .env");
  }

  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.MAIL_PORT || "587"),
    secure: process.env.MAIL_SECURE === "true",
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,
    socketTimeout: 15000,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"RJ Developer" <${process.env.MAIL_USER}>`,
    to: email,
    subject,
    html: message,
  });
};

export default sendEmail;
