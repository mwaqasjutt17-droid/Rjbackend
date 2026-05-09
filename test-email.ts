import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

async function test() {
  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.MAIL_PORT || "587"),
    secure: process.env.MAIL_SECURE === "true",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: process.env.MAIL_USER,
      to: process.env.MAIL_USER,
      subject: "Test Email from RJ Developer Local",
      text: "This is a test email.",
    });
    console.log("Success:", info.messageId);
  } catch (err) {
    console.error("Error sending email:", err);
  }
}

test();
