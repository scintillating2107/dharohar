/**
 * Baseline administrative master data. Coordinates are district / tehsil headquarters
 * (approximate, WGS84). The full Local Government Directory (LGD) village list can be
 * imported by an administrator as CSV from Settings → Master data.
 */

export interface MasterRow {
  level: "state" | "district" | "tehsil" | "village";
  state: string;
  district: string;
  tehsil?: string;
  village?: string;
  nameHi?: string;
  lat?: number;
  lng?: number;
}

const STATES: [string, string][] = [
  ["Andhra Pradesh", "आंध्र प्रदेश"],
  ["Arunachal Pradesh", "अरुणाचल प्रदेश"],
  ["Assam", "असम"],
  ["Bihar", "बिहार"],
  ["Chhattisgarh", "छत्तीसगढ़"],
  ["Goa", "गोवा"],
  ["Gujarat", "गुजरात"],
  ["Haryana", "हरियाणा"],
  ["Himachal Pradesh", "हिमाचल प्रदेश"],
  ["Jharkhand", "झारखंड"],
  ["Karnataka", "कर्नाटक"],
  ["Kerala", "केरल"],
  ["Madhya Pradesh", "मध्य प्रदेश"],
  ["Maharashtra", "महाराष्ट्र"],
  ["Manipur", "मणिपुर"],
  ["Meghalaya", "मेघालय"],
  ["Mizoram", "मिजोरम"],
  ["Nagaland", "नागालैंड"],
  ["Odisha", "ओडिशा"],
  ["Punjab", "पंजाब"],
  ["Rajasthan", "राजस्थान"],
  ["Sikkim", "सिक्किम"],
  ["Tamil Nadu", "तमिलनाडु"],
  ["Telangana", "तेलंगाना"],
  ["Tripura", "त्रिपुरा"],
  ["Uttar Pradesh", "उत्तर प्रदेश"],
  ["Uttarakhand", "उत्तराखंड"],
  ["West Bengal", "पश्चिम बंगाल"],
  ["Andaman and Nicobar Islands", "अंडमान और निकोबार द्वीपसमूह"],
  ["Chandigarh", "चंडीगढ़"],
  ["Dadra and Nagar Haveli and Daman and Diu", "दादरा और नगर हवेली और दमन और दीव"],
  ["Delhi", "दिल्ली"],
  ["Jammu and Kashmir", "जम्मू और कश्मीर"],
  ["Ladakh", "लद्दाख"],
  ["Lakshadweep", "लक्षद्वीप"],
  ["Puducherry", "पुडुचेरी"],
];

const UP_DISTRICTS: [string, string, number, number][] = [
  ["Agra", "आगरा", 27.18, 78.01],
  ["Aligarh", "अलीगढ़", 27.88, 78.08],
  ["Ambedkar Nagar", "अम्बेडकर नगर", 26.43, 82.54],
  ["Amethi", "अमेठी", 26.21, 81.69],
  ["Amroha", "अमरोहा", 28.9, 78.47],
  ["Auraiya", "औरैया", 26.47, 79.51],
  ["Ayodhya", "अयोध्या", 26.79, 82.2],
  ["Azamgarh", "आजमगढ़", 26.07, 83.18],
  ["Baghpat", "बागपत", 28.94, 77.22],
  ["Bahraich", "बहराइच", 27.57, 81.6],
  ["Ballia", "बलिया", 25.76, 84.15],
  ["Balrampur", "बलरामपुर", 27.43, 82.18],
  ["Banda", "बांदा", 25.48, 80.33],
  ["Barabanki", "बाराबंकी", 26.93, 81.19],
  ["Bareilly", "बरेली", 28.37, 79.43],
  ["Basti", "बस्ती", 26.8, 82.73],
  ["Bhadohi", "भदोही", 25.4, 82.57],
  ["Bijnor", "बिजनौर", 29.37, 78.14],
  ["Budaun", "बदायूं", 28.04, 79.12],
  ["Bulandshahr", "बुलंदशहर", 28.41, 77.85],
  ["Chandauli", "चंदौली", 25.26, 83.27],
  ["Chitrakoot", "चित्रकूट", 25.2, 80.9],
  ["Deoria", "देवरिया", 26.5, 83.78],
  ["Etah", "एटा", 27.56, 78.66],
  ["Etawah", "इटावा", 26.78, 79.02],
  ["Farrukhabad", "फर्रुखाबाद", 27.39, 79.58],
  ["Fatehpur", "फतेहपुर", 25.93, 80.81],
  ["Firozabad", "फिरोजाबाद", 27.15, 78.4],
  ["Gautam Buddha Nagar", "गौतम बुद्ध नगर", 28.47, 77.51],
  ["Ghaziabad", "गाजियाबाद", 28.67, 77.45],
  ["Ghazipur", "गाजीपुर", 25.58, 83.58],
  ["Gonda", "गोंडा", 27.13, 81.96],
  ["Gorakhpur", "गोरखपुर", 26.76, 83.37],
  ["Hamirpur", "हमीरपुर", 25.95, 80.15],
  ["Hapur", "हापुड़", 28.73, 77.78],
  ["Hardoi", "हरदोई", 27.4, 80.13],
  ["Hathras", "हाथरस", 27.6, 78.05],
  ["Jalaun", "जालौन", 25.99, 79.45],
  ["Jaunpur", "जौनपुर", 25.75, 82.69],
  ["Jhansi", "झांसी", 25.45, 78.57],
  ["Kannauj", "कन्नौज", 27.06, 79.92],
  ["Kanpur Dehat", "कानपुर देहात", 26.43, 79.95],
  ["Kanpur Nagar", "कानपुर नगर", 26.45, 80.33],
  ["Kasganj", "कासगंज", 27.81, 78.65],
  ["Kaushambi", "कौशाम्बी", 25.53, 81.38],
  ["Kushinagar", "कुशीनगर", 26.9, 83.98],
  ["Lakhimpur Kheri", "लखीमपुर खीरी", 27.95, 80.78],
  ["Lalitpur", "ललितपुर", 24.69, 78.41],
  ["Lucknow", "लखनऊ", 26.85, 80.95],
  ["Maharajganj", "महराजगंज", 27.13, 83.56],
  ["Mahoba", "महोबा", 25.29, 79.87],
  ["Mainpuri", "मैनपुरी", 27.23, 79.02],
  ["Mathura", "मथुरा", 27.49, 77.67],
  ["Mau", "मऊ", 25.94, 83.56],
  ["Meerut", "मेरठ", 28.98, 77.71],
  ["Mirzapur", "मिर्जापुर", 25.15, 82.57],
  ["Moradabad", "मुरादाबाद", 28.84, 78.77],
  ["Muzaffarnagar", "मुजफ्फरनगर", 29.47, 77.7],
  ["Pilibhit", "पीलीभीत", 28.63, 79.8],
  ["Pratapgarh", "प्रतापगढ़", 25.9, 81.94],
  ["Prayagraj", "प्रयागराज", 25.44, 81.85],
  ["Raebareli", "रायबरेली", 26.23, 81.23],
  ["Rampur", "रामपुर", 28.81, 79.03],
  ["Saharanpur", "सहारनपुर", 29.96, 77.55],
  ["Sambhal", "संभल", 28.59, 78.57],
  ["Sant Kabir Nagar", "संत कबीर नगर", 26.77, 83.04],
  ["Shahjahanpur", "शाहजहांपुर", 27.88, 79.91],
  ["Shamli", "शामली", 29.45, 77.31],
  ["Shravasti", "श्रावस्ती", 27.51, 82.05],
  ["Siddharthnagar", "सिद्धार्थनगर", 27.29, 83.07],
  ["Sitapur", "सीतापुर", 27.57, 80.68],
  ["Sonbhadra", "सोनभद्र", 24.69, 83.07],
  ["Sultanpur", "सुल्तानपुर", 26.26, 82.07],
  ["Unnao", "उन्नाव", 26.55, 80.49],
  ["Varanasi", "वाराणसी", 25.32, 82.97],
];

const LUCKNOW_TEHSILS: [string, string, number, number][] = [
  ["Sadar", "सदर", 26.85, 80.95],
  ["Malihabad", "मलिहाबाद", 26.92, 80.71],
  ["Mohanlalganj", "मोहनलालगंज", 26.69, 80.98],
  ["Bakshi Ka Talab", "बक्शी का तालाब", 26.98, 80.92],
  ["Sarojini Nagar", "सरोजनी नगर", 26.75, 80.87],
];

const LUCKNOW_VILLAGES: [string, string, string, number, number][] = [
  ["Chinhat", "चिनहट", "Sadar", 26.88, 81.05],
  ["Gomti Nagar", "गोमती नगर", "Sadar", 26.85, 81.0],
  ["Alambagh", "आलमबाग", "Sadar", 26.81, 80.9],
  ["Indira Nagar", "इंदिरा नगर", "Sadar", 26.88, 80.99],
  ["Kakori", "काकोरी", "Malihabad", 26.87, 80.79],
  ["Itaunja", "इटौंजा", "Bakshi Ka Talab", 27.07, 80.89],
];

export function baselineMasterData(): MasterRow[] {
  const rows: MasterRow[] = [];
  for (const [state, nameHi] of STATES) {
    rows.push({ level: "state", state, district: "", nameHi });
  }
  for (const [district, nameHi, lat, lng] of UP_DISTRICTS) {
    rows.push({ level: "district", state: "Uttar Pradesh", district, nameHi, lat, lng });
  }
  for (const [tehsil, nameHi, lat, lng] of LUCKNOW_TEHSILS) {
    rows.push({ level: "tehsil", state: "Uttar Pradesh", district: "Lucknow", tehsil, nameHi, lat, lng });
  }
  for (const [village, nameHi, tehsil, lat, lng] of LUCKNOW_VILLAGES) {
    rows.push({
      level: "village",
      state: "Uttar Pradesh",
      district: "Lucknow",
      tehsil,
      village,
      nameHi,
      lat,
      lng,
    });
  }
  return rows;
}
