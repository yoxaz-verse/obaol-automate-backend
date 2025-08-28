// Install dependency first: npm install xlsx
const XLSX = require("xlsx");
const fs = require("fs");

// Load your Excel file
const inputFile = "5KContact.csv"; // change this to your filename
const workbook = XLSX.readFile(inputFile);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

// Convert sheet to JSON array
const data = XLSX.utils.sheet_to_json(sheet);

// Function to split array into chunks of 250
function splitDataset(arr, size = 250) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

// Split the dataset
const chunks = splitDataset(data, 250);

// Write each chunk into a new Excel file
chunks.forEach((chunk, index) => {
  const newSheet = XLSX.utils.json_to_sheet(chunk);
  const newWorkbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(newWorkbook, newSheet, "Sheet1");

  const outputFile = `5KContact_part${index + 1}.xlsx`;
  XLSX.writeFile(newWorkbook, outputFile);
  console.log(`Saved: ${outputFile}`);
});
