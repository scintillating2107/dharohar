# Member 3 & Member 4 API Contracts

This document describes the responsibilities, input/output structures, and file locations for Member 3 (OCR) and Member 4 (Field Extraction) in the Dharohar project.

## 1. Member 3 — OCR

### Responsibility

Member 3 performs:

`Image -> OCR`

It returns:
- detected language
- complete OCR text
- text regions
- OCR confidence
- bounding boxes

Member 3 does **not** determine semantic land-record fields, validate information, compare records, or store data in the database.

### Files

Logic:
```text
src/lib/services/local/ocr.ts
```

Route:
```text
src/app/api/local/member3/extract/route.ts
```

Endpoint:
```http
POST /api/local/member3/extract
```

### Input — JSON team contract

```json
{
  "document_id": "LR10245",
  "image_url": "https://example.com/land-record.jpg"
}
```

Fields:
- `document_id`: unique document identifier
- `image_url`: URL of the land-record image

> Note: The current standalone Postman implementation may accept an uploaded image using `multipart/form-data`. If the team uses the JSON contract above, the Member 3 route must read/download the image from `image_url`.

### Output

```json
{
  "document_id": "LR10245",
  "pages": [
    {
      "page": 1,
      "language": "hi",
      "text": "खाता संख्या 125 ग्राम रामपुर तहसील सदर जिला कानपुर राज्य उत्तर प्रदेश। खातेदार राम सिंह पुत्र मोहन सिंह। खसरा संख्या 235/1। भूमि का क्षेत्रफल 0.2450 हेक्टेयर।",
      "regions": [
        {
          "text": "राम सिंह",
          "confidence": 0.96,
          "bbox": [120, 200, 350, 240]
        },
        {
          "text": "235/1",
          "confidence": 0.99,
          "bbox": [400, 300, 500, 340]
        }
      ]
    }
  ]
}
```

### Output fields

| Field | Meaning |
|---|---|
| `document_id` | Same ID received in request |
| `pages` | OCR result for each page |
| `page` | Page number |
| `language` | Detected language |
| `text` | Complete OCR text |
| `regions` | Individual OCR text regions |
| `regions[].text` | Text recognized in the region |
| `regions[].confidence` | OCR confidence |
| `regions[].bbox` | Bounding box `[x1, y1, x2, y2]` |

**Member 3 answers:** “What text is present in the image?”

It should not convert `राम सिंह` into `owner_name`. That semantic interpretation belongs to Member 4.

---

## 2. Member 4 — Field Extraction

### Responsibility

Member 4 performs:

`OCR Text -> Semantic Land-Record Fields`

It receives OCR text from Member 3 and extracts meaningful land-record fields with field-level confidence.

Member 4 does **not** perform OCR, process the original image, validate legal correctness, compare records, or store information in the database.

### Files

Logic:
```text
src/lib/services/local/extraction.ts
```

Route:
```text
src/app/api/local/member4/extract/route.ts
```

Endpoint:
```http
POST /api/local/member4/extract
```

### Input

```json
{
  "document_id": "LR10245",
  "ocr_text": "खाता संख्या 125 ग्राम रामपुर तहसील सदर जिला कानपुर राज्य उत्तर प्रदेश। खातेदार राम सिंह पुत्र मोहन सिंह। खसरा संख्या 235/1। भूमि का क्षेत्रफल 0.2450 हेक्टेयर। भूमि प्रकार कृषि।"
}
```

Fields:
- `document_id`: unique document identifier
- `ocr_text`: OCR text produced by Member 3

### Output

```json
{
  "document_id": "LR10245",
  "fields": {
    "owner_name": {
      "value": "राम सिंह",
      "confidence": 0.96
    },
    "father_name": {
      "value": "मोहन सिंह",
      "confidence": 0.95
    },
    "khasra_number": {
      "value": "235/1",
      "confidence": 0.99
    },
    "khata_number": {
      "value": "125",
      "confidence": 0.99
    },
    "village": {
      "value": "रामपुर",
      "confidence": 0.98
    },
    "tehsil": {
      "value": "सदर",
      "confidence": 0.97
    },
    "district": {
      "value": "कानपुर",
      "confidence": 0.97
    },
    "state": {
      "value": "उत्तर प्रदेश",
      "confidence": 0.98
    },
    "area": {
      "value": "0.2450",
      "unit": "hectare",
      "confidence": 0.98
    },
    "land_type": {
      "value": "कृषि",
      "confidence": 0.94
    }
  }
}
```

### Extracted fields

```text
owner_name
father_name
khasra_number
khata_number
village
tehsil
district
state
area
land_type
```

### Confidence

Member 4 confidence means:

> How confident the AI is that the extracted text corresponds to that semantic field.

This is different from Member 3 OCR confidence.

Example:

```text
Member 3:
"राम सिंह" was read correctly -> OCR confidence = 0.96

Member 4:
"राम सिंह" corresponds to owner_name -> field confidence = 0.96
```

---



## Example End-to-End Data

### Step 1 — Member 3

Input:

```json
{
  "document_id": "LR10245",
  "image_url": "https://example.com/land-record.jpg"
}
```

Output:

```json
{
  "document_id": "LR10245",
  "pages": [
    {
      "page": 1,
      "language": "hi",
      "text": "खाता संख्या 125 ग्राम रामपुर तहसील सदर जिला कानपुर राज्य उत्तर प्रदेश। खातेदार राम सिंह पुत्र मोहन सिंह। खसरा संख्या 235/1। भूमि का क्षेत्रफल 0.2450 हेक्टेयर। भूमि प्रकार कृषि।",
      "regions": []
    }
  ]
}
```

### Step 2 — Member 4

Member 4 takes `pages[0].text`:

```json
{
  "document_id": "LR10245",
  "ocr_text": "खाता संख्या 125 ग्राम रामपुर तहसील सदर जिला कानपुर राज्य उत्तर प्रदेश। खातेदार राम सिंह पुत्र मोहन सिंह। खसरा संख्या 235/1। भूमि का क्षेत्रफल 0.2450 हेक्टेयर। भूमि प्रकार कृषि।"
}
```

and returns:

```json
{
  "document_id": "LR10245",
  "fields": {
    "owner_name": {
      "value": "राम सिंह",
      "confidence": 0.96
    },
    "father_name": {
      "value": "मोहन सिंह",
      "confidence": 0.95
    },
    "khasra_number": {
      "value": "235/1",
      "confidence": 0.99
    },
    "khata_number": {
      "value": "125",
      "confidence": 0.99
    },
    "village": {
      "value": "रामपुर",
      "confidence": 0.98
    },
    "tehsil": {
      "value": "सदर",
      "confidence": 0.97
    },
    "district": {
      "value": "कानपुर",
      "confidence": 0.97
    },
    "state": {
      "value": "उत्तर प्रदेश",
      "confidence": 0.98
    },
    "area": {
      "value": "0.2450",
      "unit": "hectare",
      "confidence": 0.98
    },
    "land_type": {
      "value": "कृषि",
      "confidence": 0.94
    }
  }
}
```

---

Set the GEMINI_API_KEY into .env