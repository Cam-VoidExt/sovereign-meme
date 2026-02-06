const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = 3000;

// 1. Enable CORS so Nostr web clients can reach your node
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Ensure uploads folder exists
if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads');

const storage = multer.diskStorage({
    destination: './uploads',
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Database (Local file)
const dbFile = './memes.json';
let memes = fs.existsSync(dbFile) ? JSON.parse(fs.readFileSync(dbFile)) : [];

// --- NIP-96 CONFIGURATION ---
// This is what Nostria looks for to "auto-configure" your server
app.get('/.well-known/nostr/nip96.json', (req, res) => {
    res.json({
        api_url: `http://localhost:${PORT}/upload`, // Change to your public URL when hosting
        download_url: `http://localhost:${PORT}/uploads`,
        supported_nips: [96, 98],
        content_types: ["image/jpeg", "image/png", "image/gif", "image/webp"],
        plans: {
            "free": {
                "name": "Sovereign Free",
                "is_active": true,
                "max_file_size": 10485760 // 10MB
            }
        }
    });
});

// Upload Endpoint
app.put('/upload', upload.single('file'), (req, res) => {
    const newMeme = {
        url: `http://localhost:${PORT}/uploads/${req.file.filename}`,
        tags: req.headers['x-tags'] ? req.headers['x-tags'].split(',') : [],
        created_at: Math.floor(Date.now() / 1000)
    };
    memes.push(newMeme);
    fs.writeFileSync(dbFile, JSON.stringify(memes));
    
    // NIP-96 Success Response
    res.status(201).json({
        status: "success",
        content: "Meme indexed successfully",
        nip94_event: {
            tags: [
                ["url", newMeme.url],
                ["x", "sha256-hash-placeholder"]
            ]
        }
    });
});

// Search Endpoint
app.get('/search', (req, res) => {
    const q = req.query.q?.toLowerCase() || '';
    const filtered = memes.filter(m => m.tags.some(t => t.toLowerCase().includes(q)));
    res.json(filtered);
});

app.listen(PORT, () => {
    console.log(`🚀 Sovereign Meme Node live at http://localhost:${PORT}`);
    console.log(`📡 NIP-96 Config: http://localhost:${PORT}/.well-known/nostr/nip96.json`);
});