import { describe, expect, it } from "vitest";
import { translate, translateDynamic } from "@/lib/i18n";

describe("translate", () => {
  it("returns Hindi with interpolated variables", () => {
    expect(translate("hi", "Welcome, {name}", { name: "Asha" })).toBe("स्वागत है, Asha");
  });

  it("falls back to English for unknown text and for the English locale", () => {
    expect(translate("hi", "Some unknown sentence")).toBe("Some unknown sentence");
    expect(translate("en", "Dashboard")).toBe("Dashboard");
  });

  it("translates place names from master data", () => {
    expect(translate("hi", "Lucknow")).toBe("लखनऊ");
    expect(translate("hi", "Uttar Pradesh")).toBe("उत्तर प्रदेश");
  });
});

describe("translateDynamic (server-generated text)", () => {
  it("matches templates and translates captured values", () => {
    expect(translateDynamic("hi", "owner name extracted with 62% confidence")).toBe("स्वामी का नाम 62% विश्वसनीयता से निकाला गया");
    expect(translateDynamic("hi", "Record LR-2026-000001 verified")).toBe("अभिलेख LR-2026-000001 सत्यापित");
  });

  it("translates multi-part step details segment by segment", () => {
    expect(translateDynamic("hi", "Quality 41 → 77 · deskew, background flattening")).toBe("गुणवत्ता 41 → 77 · तिरछापन सुधार, पृष्ठभूमि समतलीकरण");
    expect(translateDynamic("hi", "Score 80, REVIEW_REQUIRED; 0 error(s), 2 warning(s)")).toBe(
      "अंक 80, समीक्षा आवश्यक; 0 त्रुटियाँ, 2 चेतावनियाँ"
    );
  });

  it("leaves free text and English untouched", () => {
    expect(translateDynamic("hi", "Ram Prasad")).toBe("Ram Prasad");
    expect(translateDynamic("en", "Record LR-2026-000001 verified")).toBe("Record LR-2026-000001 verified");
  });
});
