import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/auth/discord/callback", async (req, res) => {
    const { code } = req.body;

    if (!code) return res.status(400).json({ error: "Missing code" });

    try {
        const tokenData = new URLSearchParams({
            client_id: process.env.CLIENT_ID,
            client_secret: process.env.CLIENT_SECRET,
            grant_type: "authorization_code",
            code,
            redirect_uri: process.env.REDIRECT_URI
        });

        // Exchange code for token
        const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: tokenData
        });

        const tokenJson = await tokenResponse.json();
        if (tokenJson.error) return res.status(401).json({ error: tokenJson.error_description });

        // Fetch user info
        const userResponse = await fetch("https://discord.com/api/users/@me", {
            headers: {
                Authorization: `${tokenJson.token_type} ${tokenJson.access_token}`
            }
        });

        const userJson = await userResponse.json();

        return res.json({
            user: {
                id: userJson.id,
                username: userJson.username,
                avatar: userJson.avatar,
                email: userJson.email
            }
        });

    } catch (err) {
        return res.status(500).json({ error: "OAuth failed", details: err.message });
    }
});

app.listen(3000, () => console.log("Auth server running"));
