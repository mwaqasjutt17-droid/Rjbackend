import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User, { IUser } from "../models/User.js";
import sendEmail from "../utils/sendEmail.js";

// ── helpers ──────────────────────────────────────────────────────────────────

const generateToken = (id: string) =>
  jwt.sign({ id }, process.env.JWT_SECRET as string, {
    expiresIn: (process.env.JWT_EXPIRE as any) || "7d",
  });

const sendTokenResponse = (user: IUser, statusCode: number, res: Response) => {
  const token = generateToken(user._id!.toString());
  const cookieExpire = 7 * 24 * 60 * 60 * 1000; // 7 days

  res
    .status(statusCode)
    .cookie("token", token, {
      expires: new Date(Date.now() + cookieExpire),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    })
    .json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
};

const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const otpEmailHtml = (otp: string, heading = "Verify your email") => `
<div style="font-family:Arial,sans-serif;background:#0f172a;color:#fff;padding:40px;border-radius:12px;max-width:480px;margin:auto">
  <h2 style="color:#f59e0b;margin-bottom:8px">${heading}</h2>
  <p style="color:#94a3b8;margin-bottom:24px">Use the code below. It expires in <strong>30 seconds</strong>.</p>
  <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px">
    <span style="font-size:36px;font-weight:700;letter-spacing:12px;color:#f59e0b">${otp}</span>
  </div>
  <p style="color:#64748b;font-size:12px">If you didn't request this, please ignore this email.</p>
</div>`;

// ── controllers ───────────────────────────────────────────────────────────────

// POST /api/auth/register
export const register = async (req: Request, res: Response): Promise<any> => {
  try {
    const { name, email, password } = req.body;
    console.log("[register] START - email:", email);

    if (!name?.trim() || !email?.trim() || !password?.trim()) {
      return res
        .status(400)
        .json({ success: false, error: "Please provide name, email and password." });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ success: false, error: "Password must be at least 6 characters." });
    }

    // If unverified user exists, delete and re-create
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    console.log("[register] existing user check done, found:", !!existing);
    if (existing) {
      if (existing.isVerified) {
        return res
          .status(400)
          .json({ success: false, error: "An account with this email already exists." });
      }
      await User.deleteOne({ _id: existing._id });
      console.log("[register] deleted unverified user");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 30_000); // 30 s
    console.log("[register] OTP generated:", otp);

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      otp,
      otpExpiry,
      isVerified: false,
    });
    console.log("[register] user created in DB, id:", user._id);

    try {
      console.log("[register] sending email...");
      await sendEmail({
        email: user.email,
        subject: "Your RJ Developer Verification Code",
        message: otpEmailHtml(otp),
      });
      console.log("[register] email sent successfully!");
    } catch (emailErr: any) {
      console.error("[register] EMAIL FAILED:", emailErr.message);
      await User.deleteOne({ _id: user._id });
      return res
        .status(500)
        .json({ success: false, error: "Could not send verification email. Please try again." });
    }

    res.status(200).json({
      success: true,
      message: "A 6-digit OTP has been sent to your email.",
      email: user.email,
    });
  } catch (err: any) {
    console.error("register error:", err);
    res.status(500).json({ success: false, error: err.message || "Server error" });
  }
};

// POST /api/auth/verify-otp
export const verifyOTP = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res
        .status(400)
        .json({ success: false, error: "Email and OTP are required." });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({ success: false, error: "Account not found." });
    }
    if (user.isVerified) {
      return res.status(400).json({ success: false, error: "Account is already verified." });
    }
    if (!user.otp || user.otp !== otp.toString()) {
      return res.status(400).json({ success: false, error: "Invalid OTP. Please try again." });
    }
    if (!user.otpExpiry || user.otpExpiry < new Date()) {
      return res.status(400).json({ success: false, error: "OTP has expired. Please request a new one." });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (err: any) {
    console.error("verifyOTP error:", err);
    res.status(500).json({ success: false, error: err.message || "Server error" });
  }
};

// POST /api/auth/resend-otp
export const resendOTP = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: "Email is required." });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({ success: false, error: "Account not found." });
    }
    if (user.isVerified) {
      return res.status(400).json({ success: false, error: "Account is already verified." });
    }

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 30_000);
    await user.save();

    try {
      await sendEmail({
        email: user.email,
        subject: "Your New RJ Developer Verification Code",
        message: otpEmailHtml(otp, "New verification code"),
      });
    } catch (emailErr: any) {
      console.error("Resend email failed:", emailErr.message);
      return res
        .status(500)
        .json({ success: false, error: "Could not send email. Please try again." });
    }

    res.status(200).json({ success: true, message: "A new OTP has been sent to your email." });
  } catch (err: any) {
    console.error("resendOTP error:", err);
    res.status(500).json({ success: false, error: err.message || "Server error" });
  }
};

// POST /api/auth/login
export const login = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password?.trim()) {
      return res
        .status(400)
        .json({ success: false, error: "Please provide email and password." });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: "Invalid email or password." });
    }

    if (!user.isVerified) {
      // Resend OTP automatically
      const otp = generateOTP();
      user.otp = otp;
      user.otpExpiry = new Date(Date.now() + 30_000);
      await user.save();

      try {
        await sendEmail({
          email: user.email,
          subject: "Complete your RJ Developer verification",
          message: otpEmailHtml(otp),
        });
      } catch (_) {
        // non-fatal
      }

      return res.status(401).json({
        success: false,
        error: "Email not verified. A new OTP has been sent to your email.",
        unverified: true,
        email: user.email,
      });
    }

    sendTokenResponse(user, 200, res);
  } catch (err: any) {
    console.error("login error:", err);
    res.status(500).json({ success: false, error: err.message || "Server error" });
  }
};

// GET /api/auth/logout
export const logout = (_req: Request, res: Response): void => {
  res
    .cookie("token", "none", {
      expires: new Date(Date.now() + 5_000),
      httpOnly: true,
    })
    .status(200)
    .json({ success: true, message: "Logged out successfully." });
};

// GET /api/auth/me  (protected)
export const getMe = async (req: Request | any, res: Response): Promise<any> => {
  try {
    const user = await User.findById(req.user.id).select("-password -otp -otpExpiry");
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found." });
    }
    res.status(200).json({ success: true, data: user });
  } catch (err: any) {
    console.error("getMe error:", err);
    res.status(500).json({ success: false, error: err.message || "Server error" });
  }
};
