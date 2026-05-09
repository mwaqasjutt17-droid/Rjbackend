import app from "./api/index.js";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
async function startServer() {
    const PORT = process.env.PORT || 8000;
    // Basic API start
    app.listen(Number(PORT), () => {
        console.log(`Backend Server running on http://localhost:${PORT}`);
    });
}
startServer();
