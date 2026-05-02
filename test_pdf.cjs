const fs = require('fs');
const pdfParse = require('pdf-parse');
async function test() {
  const buffer = fs.readFileSync('package.json');
  try {
    const result = await pdfParse(buffer);
    console.log("Success with pdfParse()");
  } catch (err) {
    console.log("Error with pdfParse():", err.message);
  }
}
test();
