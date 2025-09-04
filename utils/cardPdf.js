// utils/cardPdf.js
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const PDFDocument = require("pdfkit");
const { supabaseAdmin } = require("../config/supabaseClient");

// --- Template image paths ---
const TEMPLATES = {
    edupass: {
        front: path.join(__dirname, "..", "templates", "edu_front.jpg"),
        back: path.join(__dirname, "..", "templates", "edu_back.jpg"),
    },
    scholarpass: {
        front: path.join(__dirname, "..", "templates", "scholar_front.jpg"),
        back: path.join(__dirname, "..", "templates", "scholar_back.jpg"),
    },
    infinitepass: {
        front: path.join(__dirname, "..", "templates", "infinite_front.jpg"),
        back: path.join(__dirname, "..", "templates", "infinite_back.jpg"),
    },
};

// --- Local font path (DejaVuSans) ---
const FONT_PATH = path.join(__dirname, "..", "fonts", "DejaVuSans.ttf");
console.log("Font exists?", fs.existsSync(FONT_PATH), FONT_PATH);

// --- Positions and sizes (relative percentages) ---
const POSITIONS = {
    edupass: {
        name: { x: 0.10, y: 0.68, size: 40 },
        number: { x: 0.10, y: 0.78, size: 38 },
        validLine: { xLeft: 0.10, xRight: 0.55, y: 0.86, size: 24 }
    },
    scholarpass: {
        name: { x: 0.10, y: 0.68, size: 36 },
        number: { x: 0.10, y: 0.78, size: 32 },
        validLine: { xLeft: 0.10, xRight: 0.55, y: 0.86, size: 18 }
    },
    infinitepass: {
        name: { x: 0.10, y: 0.68, size: 40 },
        number: { x: 0.10, y: 0.78, size: 38 },
        validLine: { xLeft: 0.10, xRight: 0.55, y: 0.86, size: 30 }
    }
};

function formatDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
}

// Build a 2-page PDF (front + back with text overlay)
async function makePdfBuffer(cardKey, { name, cardNumber, validFrom, validThru }) {
    const tpl = TEMPLATES[cardKey];
    if (!tpl) throw new Error(`Unknown card template: ${cardKey}`);

    if (!fs.existsSync(tpl.front)) throw new Error(`Front template not found: ${tpl.front}`);
    if (!fs.existsSync(tpl.back)) throw new Error(`Back template not found: ${tpl.back}`);

    const pos = POSITIONS[cardKey];
    if (!pos) throw new Error(`No positions configured for card type "${cardKey}"`);

    const frontMeta = await sharp(tpl.front).metadata();
    const backMeta = await sharp(tpl.back).metadata();

    return await new Promise((resolve, reject) => {
        const doc = new PDFDocument({ autoFirstPage: false });
        const chunks = [];
        doc.on("data", (c) => chunks.push(c));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        // --- Front page ---
        doc.addPage({ size: [frontMeta.width, frontMeta.height], margin: 0 });
        doc.image(tpl.front, 0, 0, { width: frontMeta.width, height: frontMeta.height });

        // Apply font
        doc.font(FONT_PATH).fillColor("#ffffff");

        // Name
        const nx = frontMeta.width * pos.name.x;
        const ny = frontMeta.height * pos.name.y;
        doc.fontSize(pos.name.size).text(name || "", nx, ny);

        // Card Number
        const cx = frontMeta.width * pos.number.x;
        const cy = frontMeta.height * pos.number.y;
        doc.fontSize(pos.number.size).text(cardNumber || "", cx, cy);

        // Valid lines
        const fx = frontMeta.width * pos.validLine.xLeft;
        const tx = frontMeta.width * pos.validLine.xRight;
        const fy = frontMeta.height * pos.validLine.y;
        doc.fontSize(pos.validLine.size).text(`VALID FROM: ${formatDate(validFrom)}`, fx, fy);
        doc.fontSize(pos.validLine.size).text(`VALID THRU: ${formatDate(validThru)}`, tx, fy);

        // --- Back page ---
        doc.addPage({ size: [backMeta.width, backMeta.height], margin: 0 });
        doc.image(tpl.back, 0, 0, { width: backMeta.width, height: backMeta.height });

        doc.end();
    });
}

// Generate + Upload to Supabase Storage
async function generateAndUploadCardPDF({
    cardName, name, cardNumber, validFrom, validThru,
    bucket = "elite-cards", pathPrefix = "cards/"
}) {
    if (!cardName) throw new Error("cardName is required");
    if (!cardNumber) throw new Error("cardNumber is required");

    const cardKey = (cardName || "").toLowerCase();
    const pdfBuffer = await makePdfBuffer(cardKey, { name, cardNumber, validFrom, validThru });

    const safeCardNumber = String(cardNumber).replace(/[^\w\-]/g, "_");
    const storagePath = `${pathPrefix}${safeCardNumber}.pdf`;

    const { error: upErr } = await supabaseAdmin.storage
        .from(bucket)
        .upload(storagePath, pdfBuffer, { contentType: "application/pdf", upsert: true });

    if (upErr) {
        throw new Error(`Storage upload error: ${upErr.message || JSON.stringify(upErr)}`);
    }

    const { data: pub } = supabaseAdmin.storage.from(bucket).getPublicUrl(storagePath);
    const publicUrl = pub?.publicUrl ?? null;

    return { storagePath, publicUrl };
}

module.exports = {
    makePdfBuffer,
    generateAndUploadCardPDF,
};
