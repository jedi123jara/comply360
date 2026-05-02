const fs = require('fs');
const pdfParse = require('pdf-parse');
async function test() {
  const buffer = fs.readFileSync('package.json');
  try {
    const result = await new pdfParse.PDFParse({ data: buffer }).getText();
    console.log("Success with new PDFParse().getText()");
  } catch (err) {
    console.log("Error with new PDFParse().getText():", err.message);
  }
}
test();
