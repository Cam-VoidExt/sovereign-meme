require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DOMAIN = process.env.DOMAIN || `http://localhost:${PORT}`;

// Middleware & Routing
app.use(cors());
app.use(express.json());
app.use(express.static('public')); 
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Initialize Folders & Database
if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads');
const dbFile = './memes.json';
let memes = fs.existsSync(dbFile) ? JSON.parse(fs.readFileSync(dbFile)) : [];

// Storage Engine
const storage = multer.diskStorage({
    destination: './uploads',
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// NIP-96 Handshake
app.get('/.well-known/nostr/nip96.json', (req, res) => {
    res.json({
        api_url: `${DOMAIN}/upload`,
        download_url: `${DOMAIN}/uploads`,
        supported_nips: [96, 98],
        content_types: ["image/jpeg", "image/png", "image/gif", "image/webp"],
        plans: { "free": { "name": "Sovereign Free", "is_active": true, "max_file_size": 10485760 } }
    });
});

// NIP-94 Compliant Upload
app.put('/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ status: "error", message: "No file uploaded" });
    
    const fileBuffer = fs.readFileSync(req.file.path);
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    
    const newMeme = {
        url: `${DOMAIN}/uploads/${req.file.filename}`,
        tags: req.headers['x-tags'] ? req.headers['x-tags'].split(',') : [],
        created_at: Math.floor(Date.now() / 1000),
        sha256: hash
    };
    
    memes.push(newMeme);
    fs.writeFileSync(dbFile, JSON.stringify(memes));
    
    res.status(201).json({ 
        status: "success", 
        content: "Meme indexed", 
        nip94_event: { tags: [["url", newMeme.url], ["x", hash]] } 
    });
});

// Search API
app.get('/search', (req, res) => {
    const q = req.query.q?.toLowerCase() || '';
    const filtered = memes.filter(m => m.tags.some(t => t.toLowerCase().includes(q)));
    res.json(filtered);
});

app.listen(PORT, () => {
    console.log(`🚀 Sovereign Node live: ${DOMAIN}`);
    console.log(`📡 Handshake: ${DOMAIN}/.well-known/nostr/nip96.json`);
});