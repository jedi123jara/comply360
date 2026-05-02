const fs = require('fs');

async function extractTextFromPdf(buffer) {
  // pdf-parse v2: getText() → { pages: [{text,num}], text: string, total: number }
  const { PDFParse } = require('pdf-parse');
  const result = await new PDFParse({ data: buffer }).getText();
  // Limpiar marcadores de página "-- X of Y --" que v2 inserta
  return (result.text || '').replace(/\n*-- \d+ of \d+ --\n*/g, '\n\n').trim();
}

async function test() {
  const buffer = fs.readFileSync('test.pdf');
  try {
    const text = await extractTextFromPdf(buffer);
    console.log("Success! Extracted text:", text.slice(0, 50));
  } catch (err) {
    console.log("Error extracting:", err);
  }
}
test();
