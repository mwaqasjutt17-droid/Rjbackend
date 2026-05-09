import mongoose from "mongoose";
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Please add a name"],
        trim: true,
    },
    email: {
        type: String,
        required: [true, "Please add an email"],
        unique: true,
        lowercase: true,
        trim: true,
        match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
            "Please add a valid email",
        ],
    },
    password: {
        type: String,
        required: [true, "Please add a password"],
        minlength: 6,
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    otp: {
        type: String,
        default: undefined,
    },
    otpExpiry: {
        type: Date,
        default: undefined,
    },
}, {
    timestamps: true,
});
// Delete model cache to prevent OverwriteModelError in hot-reload
const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;
