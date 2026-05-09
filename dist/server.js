import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
dotenv.config();
// Connect to database
connectDB();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
async function startServer() {
    const app = express();
    const PORT = process.env.PORT || 3000;
    app.use(express.json());
    app.use(cookieParser());
    // Configure CORS
    app.use(cors({ origin: true, credentials: true }));
    // Mount routers
    app.use("/api/auth", authRoutes);
    // API Route: Contact Form
    app.post("/api/contact", async (req, res) => {
        const { name, email, phone, sector, address, message } = req.body;
        if (!name || !email || !phone || !sector || !address || !message) {
            return res.status(400).json({ error: "All fields are required" });
        }
        try {
            const hasAuth = process.env.MAIL_HOST && process.env.MAIL_USER && process.env.MAIL_PASS;
            if (hasAuth) {
                const transporter = nodemailer.createTransport({
                    host: process.env.MAIL_HOST,
                    port: parseInt(process.env.MAIL_PORT || "587"),
                    secure: process.env.MAIL_SECURE === "true",
                    auth: {
                        user: process.env.MAIL_USER,
                        pass: process.env.MAIL_PASS,
                    },
                });
                await transporter.sendMail({
                    from: `"RJ Developer Contact" <${process.env.MAIL_USER}>`,
                    to: process.env.MAIL_USER,
                    subject: `New Project Inquiry from ${name} (${sector})`,
                    text: `
            Name: ${name}
            Email: ${email}
            Phone: ${phone}
            Sector: ${sector}
            Address: ${address}
            
            About Project:
            ${message}
          `,
                    html: `
            <h3>New Project Inquiry</h3>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone}</p>
            <p><strong>Sector:</strong> ${sector}</p>
            <p><strong>Address:</strong> ${address}</p>
            <p><strong>About Project:</strong></p>
            <p>${message}</p>
          `,
                });
                console.log("Email sent successfully via SMTP");
            }
            else {
                console.warn("Mail credentials not configured. Mocking success for demo.");
                console.log("Contact Data Received:", { name, email, phone, sector, address, message });
            }
            res.status(200).json({ message: "Thank you for sharing your project details! We will get back to you soon." });
        }
        catch (error) {
            console.error("Error sending email:", error);
            res.status(500).json({ error: "Failed to send message. Please try again later." });
        }
    });
    // API is independent of frontend static files in dev.
    // In production, you can still serve static files or host them on a CDN.
    // For now, we only serve API routes here.
    // Global Error Handler
    app.use((err, req, res, next) => {
        console.error("Unhandled Server Error:", err);
        res.status(500).json({ success: false, error: "Internal Server Error" });
    });
    app.listen(Number(PORT), "0.0.0.0", () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}
startServer();
