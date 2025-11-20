import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.get("/callback", async (req, res) => {
    const code = req.query.code;
    if (!code) return res.send("No code provided");

    const data = new URLSearchParams({
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.REDIRECT_URI
    });

    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        body: data,
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        }
    });

    const tokenData = await tokenResponse.json();

    res.json(tokenData);
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
