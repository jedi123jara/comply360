import fs from 'fs';
import pdfParse from 'pdf-parse';

async function test() {
  const buffer = fs.readFileSync('package.json');
  try {
    const result = await new pdfParse.PDFParse({ data: buffer }).getText();
    console.log("Success");
  } catch (err) {
    console.log("Error:", err);
  }
}
test();
