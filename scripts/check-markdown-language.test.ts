import { describe, it, expect } from "vitest";
import {
  sanitizeMarkdownLine,
  buildGrammarMapping,
  isGrammarCheckSkipped,
} from "./check-markdown-language.js";

describe("check-markdown-language tests", () => {
  describe("sanitizeMarkdownLine - character length and offset preservation", () => {
    it("should preserve the exact original length of the line after sanitization", () => {
      const inputs = [
        "Hei `koodi` maailma!",
        "Klikkaa [linkkiä](https://esimerkki.fi) lukeaksesi lisää.",
        "<!-- kommentti --> Alkuperäinen teksti",
        "**lihavoitu** ja *kursivoitu* sana",
        "> [!NOTE]",
        "> [Note::Historiallinen huomio] Tämä on tekstiä.",
        "![kuvaus](/kuva.png) kuva",
        "Vieraile osoitteessa https://esimerkki.fi nyt.",
        "<br/> Rivinvaihto",
      ];

      for (const input of inputs) {
        const cleaned = sanitizeMarkdownLine(input);
        expect(cleaned.length).toBe(input.length);
      }
    });

    it("should mask inline code blocks with spaces of identical length", () => {
      const input = "Hei `koodi`!";
      // index of "`koodi`" is 4, length is 7
      const cleaned = sanitizeMarkdownLine(input);
      expect(cleaned).toBe("Hei        !");
    });

    it("should keep markdown link label but mask brackets and URL with spaces", () => {
      const input = "[linkki](https://test.fi)";
      // Length: 25. Label: "linkki" (6 chars).
      // Let's verify that the characters of "linkki" are at the correct indices.
      const cleaned = sanitizeMarkdownLine(input);
      expect(cleaned).toHaveLength(input.length);
      expect(cleaned.trim()).toBe("linkki");
      expect(cleaned.indexOf("linkki")).toBe(input.indexOf("linkki"));
    });

    it("should mask markdown image tags entirely with spaces", () => {
      const input = "Katso ![kuva](img.png) tästä.";
      const cleaned = sanitizeMarkdownLine(input);
      expect(cleaned).toHaveLength(input.length);
      expect(cleaned).toBe("Katso                  tästä.");
    });

    it("should keep custom callout title at exact original offset and mask rest", () => {
      const input = "> [Note::Historiallinen huomio] teksti";
      const cleaned = sanitizeMarkdownLine(input);
      expect(cleaned).toHaveLength(input.length);
      expect(cleaned.includes("Historiallinen huomio")).toBe(true);
      expect(cleaned.indexOf("Historiallinen huomio")).toBe(input.indexOf("Historiallinen huomio"));
    });

    it("should mask simple callout tag entirely", () => {
      const input = "> [!NOTE] huomio";
      const cleaned = sanitizeMarkdownLine(input);
      expect(cleaned).toHaveLength(input.length);
      expect(cleaned).toBe("          huomio");
    });

    it("should mask emphasis markers with spaces of identical length", () => {
      const input = "Tämä on **tärkeää** ja *näin*.";
      const cleaned = sanitizeMarkdownLine(input);
      expect(cleaned).toHaveLength(input.length);
      expect(cleaned).toBe("Tämä on   tärkeää   ja  näin .");
    });
  });

  describe("buildGrammarMapping - whitespace collapsing and punctuation handling", () => {
    it("should collapse multiple consecutive spaces and trim endpoints", () => {
      const input = "  Sana1    Sana2   Sana3  ";
      const { grammarText, indexMap } = buildGrammarMapping(input);

      expect(grammarText).toBe("Sana1 Sana2 Sana3");
      expect(grammarText.length).toBe(indexMap.length);

      // Verify that individual letters map back to the correct indices in 'input'
      // 'Sana1' is index 2 in input
      expect(indexMap[0]).toBe(2); // 'S'
      expect(indexMap[4]).toBe(6); // '1'
      // Space between Sana1 and Sana2 is the first space at index 7 in input
      expect(indexMap[5]).toBe(7); // ' '
      // 'Sana2' is index 11 in input
      expect(indexMap[6]).toBe(11); // 'S'
    });

    it("should handle punctuation marks by removing leading space to prevent Voikko complaints", () => {
      const input = "Tämä on lause . Ja toinen , jne .";
      const { grammarText, indexMap } = buildGrammarMapping(input);

      // It should pull "." close to "lause" and "," close to "toinen"
      expect(grammarText).toBe("Tämä on lause. Ja toinen, jne.");
      expect(grammarText.length).toBe(indexMap.length);

      // Verify that punctuation marks map back to their original position in 'input'
      const dot1IndexInGrammar = grammarText.indexOf(".");
      const commaIndexInGrammar = grammarText.indexOf(",");

      expect(indexMap[dot1IndexInGrammar]).toBe(input.indexOf("."));
      expect(indexMap[commaIndexInGrammar]).toBe(input.indexOf(","));
    });
  });

  describe("isGrammarCheckSkipped - skipping headers, lists, tables, etc.", () => {
    it("should skip empty lines or spaces", () => {
      expect(isGrammarCheckSkipped("")).toBe(true);
      expect(isGrammarCheckSkipped("   ")).toBe(true);
    });

    it("should skip Markdown ATX headings", () => {
      expect(isGrammarCheckSkipped("# Otsikko")).toBe(true);
      expect(isGrammarCheckSkipped("## Alaotsikko")).toBe(true);
      expect(isGrammarCheckSkipped("###### Pienin otsikko")).toBe(true);
      // But not normal lines starting with text containing a hash
      expect(isGrammarCheckSkipped("Tämä ei ole #otsikko")).toBe(false);
    });

    it("should skip unordered and ordered list items", () => {
      expect(isGrammarCheckSkipped("* Lista-alkio")).toBe(true);
      expect(isGrammarCheckSkipped("- Lista-alkio")).toBe(true);
      expect(isGrammarCheckSkipped("+ Lista-alkio")).toBe(true);
      expect(isGrammarCheckSkipped("1. Ensimmäinen")).toBe(true);
      expect(isGrammarCheckSkipped("12. Kahdestoista")).toBe(true);
      // But not list-like punctuation within a sentence
      expect(isGrammarCheckSkipped("Yksi ja 2. puoli")).toBe(false);
    });

    it("should skip Markdown table rows", () => {
      expect(isGrammarCheckSkipped("| sarake 1 | sarake 2 |")).toBe(true);
      expect(isGrammarCheckSkipped("|---|-|")).toBe(true);
    });

    it("should skip callout indicator headers alone", () => {
      expect(isGrammarCheckSkipped("> [!NOTE]")).toBe(true);
      expect(isGrammarCheckSkipped("> [Note::Oma Otsikko]")).toBe(true);
      expect(isGrammarCheckSkipped(" > [!WARNING] ")).toBe(true);
      // But should check if it contains actual content inside blockquote
      expect(isGrammarCheckSkipped("> Tämä on lause.")).toBe(false);
    });

    it("should skip purely HTML tag lines or purely URL lines", () => {
      expect(isGrammarCheckSkipped("<br/>")).toBe(true);
      expect(isGrammarCheckSkipped("https://esimerkki.fi")).toBe(true);
      expect(isGrammarCheckSkipped("Tässä on url https://esimerkki.fi")).toBe(false);
    });
  });
});
