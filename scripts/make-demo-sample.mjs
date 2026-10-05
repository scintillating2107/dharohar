// Generates the bilingual (Hindi + English) khatauni scan used by the workflow demo:
// public/samples/demo-khatauni-hi.jpg. The page is deliberately degraded (tilt, aged paper,
// shading, blur, noise) so the enhancement step has visible work to do.
// Usage: node scripts/make-demo-sample.mjs
import sharp from "sharp";
import { mkdirSync } from "fs";

const W = 1240;
const H = 1754;
const font = "Nirmala UI, Mangal, Noto Sans Devanagari, Lohit Devanagari, sans-serif";

const lines = [
  ["उत्तर प्रदेश शासन · राजस्व परिषद", 30, 700, 120],
  ["खतौनी (अधिकार अभिलेख) · Khatauni — Record of Rights", 30, 700, 175],
  ["फसली वर्ष 1431 · Record year 2024", 24, 400, 222],
  ["जिला: लखनऊ        तहसील: सदर        ग्राम: चिनहट", 28, 400, 320],
  ["खाता संख्या: 431", 28, 400, 400],
  ["खातेदार का नाम: सीता देवी पत्नी राम प्रसाद वर्मा", 28, 400, 470],
  ["खसरा संख्या: 512/3", 28, 400, 540],
  ["रकबा: 0.4210 हेक्टेयर", 28, 400, 610],
  ["भूमि का प्रकार: कृषि (भूमिधरी)", 28, 400, 680],
  ["दाखिल खारिज संख्या: M-2023-0457", 28, 400, 750],
  ["दाखिल खारिज दिनांक: 12/07/2023", 28, 400, 820],
  ["आदेश: नायब तहसीलदार, सदर द्वारा उत्तराधिकार के आधार पर नामांतरण स्वीकृत।", 22, 400, 910],
  ["Order: Mutation sanctioned on succession by Naib Tehsildar, Sadar.", 22, 400, 950],
  ["राजस्व निरीक्षक के हस्ताक्षर", 24, 400, 1460],
];

const text = lines
  .map(
    ([t, size, weight, y]) =>
      `<text x="90" y="${y}" font-family="${font}" font-size="${size}" font-weight="${weight}" fill="#2a2420">${t}</text>`
  )
  .join("");

const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="age" cx="50%" cy="45%" r="75%">
      <stop offset="0%" stop-color="#efe3c4"/>
      <stop offset="80%" stop-color="#d9c79c"/>
      <stop offset="100%" stop-color="#b9a272"/>
    </radialGradient>
    <linearGradient id="shade" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0%" stop-color="#000" stop-opacity="0.18"/>
      <stop offset="35%" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.08"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#age)"/>
  <rect x="60" y="270" width="${W - 120}" height="720" fill="none" stroke="#6b5a45" stroke-width="2"/>
  <line x1="60" y1="360" x2="${W - 60}" y2="360" stroke="#6b5a45" stroke-width="1.5"/>
  <ellipse cx="980" cy="1240" rx="150" ry="95" fill="#a8885a" opacity="0.25"/>
  <circle cx="1000" cy="1450" r="70" fill="none" stroke="#5a3f8a" stroke-width="5" opacity="0.45"/>
  <text x="955" y="1458" font-family="${font}" font-size="20" fill="#5a3f8a" opacity="0.55">मुहर</text>
  ${text}
  <rect width="${W}" height="${H}" fill="url(#shade)"/>
</svg>`;

// Random speckle noise layer
const noise = Buffer.alloc(W * H * 4);
for (let i = 0; i < W * H; i++) {
  const dark = Math.random() < 0.012;
  const v = dark ? 40 : 255;
  noise[i * 4] = v;
  noise[i * 4 + 1] = v;
  noise[i * 4 + 2] = v;
  noise[i * 4 + 3] = dark ? 140 : 0;
}

mkdirSync("public/samples", { recursive: true });
await sharp(Buffer.from(svg))
  .composite([{ input: noise, raw: { width: W, height: H, channels: 4 } }])
  .rotate(-2.6, { background: "#c9b688" })
  .blur(0.9)
  .modulate({ brightness: 0.93 })
  .jpeg({ quality: 70 })
  .toFile("public/samples/demo-khatauni-hi.jpg");
console.log("wrote public/samples/demo-khatauni-hi.jpg");
