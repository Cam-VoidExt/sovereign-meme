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

app.use(cors());
app.use(express.json());
app.use(express.static('public')); 
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads');
const dbFile = './memes.json';
let memes = fs.existsSync(dbFile) ? JSON.parse(fs.readFileSync(dbFile)) : [];

// BLOSSOM COMPATIBILITY: Rename files to their SHA-256 hash
const storage = multer.diskStorage({
    destination: './uploads',
    filename: (req, file, cb) => {
        cb(null, 'temp-' + Date.now()); // Rename after hash is calculated
    }
});

const upload = multer({ storage });

app.get('/config', (req, res) => {
    res.json({ 
        lud16: process.env.LIGHTNING_ADDRESS || "",
        domain: DOMAIN
    });
});

app.put('/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).send("No file.");
    
    const fileBuffer = fs.readFileSync(req.file.path);
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const ext = path.extname(req.file.originalname);
    const finalFilename = `${hash}${ext}`;
    const finalPath = path.join('./uploads', finalFilename);

    // Rename file to its SHA256 hash (Blossom Style)
    fs.renameSync(req.file.path, finalPath);
    
    const newMeme = {
        url: `${DOMAIN}/uploads/${finalFilename}`,
        tags: req.headers['x-tags'] ? [req.headers['x-tags']] : ['meme'],
        sha256: hash,
        created_at: Date.now()
    };
    
    memes.push(newMeme);
    fs.writeFileSync(dbFile, JSON.stringify(memes));
    res.status(201).json(newMeme);
});

// BLOSSOM COMPATIBILITY: Fetch by hash
app.get('/:hash', (req, res) => {
    const hash = req.params.hash;
    const meme = memes.find(m => m.sha256 === hash || m.url.includes(hash));
    if (meme) {
        const filename = path.basename(meme.url);
        res.sendFile(path.join(__dirname, 'uploads', filename));
    } else {
        res.status(404).send("Blob not found");
    }
});

app.get('/search', (req, res) => {
    res.json(memes.sort((a,b) => b.created_at - a.created_at));
});

// BLOSSOM LIST ENDPOINT: For distributed aggregation
app.get('/list/:pubkey', (req, res) => {
    // For now, return all memes as a Blossom-compliant list
    res.json(memes.map(m => ({
        url: m.url,
        sha256: m.sha256,
        size: fs.statSync(path.join('./uploads', path.basename(m.url))).size,
        uploaded: Math.floor(m.created_at / 1000)
    })));
});

app.listen(PORT, () => {
    console.log(`\n⚡ Sovereign Blossom Node Active: ${DOMAIN}\n`);
});