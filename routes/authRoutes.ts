import express from "express";
import { register, login, verifyOTP, resendOTP, logout, getMe } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", resendOTP);
router.get("/logout", logout); // Sometimes logout doesn't need to be strictly protected if cookie is sent
router.get("/me", protect, getMe);

export default router;
