const fs = require("fs");
const readline = require("readline");

// Input and output CSV file paths
const inputFile = "inputspice.csv";
const outputFile = "filtered_UTTAR_PRADESH.csv";

const reader = readline.createInterface({
  input: fs.createReadStream(inputFile),
  crlfDelay: Infinity,
});

const output = fs.createWriteStream(outputFile);
let headerSaved = false;

reader.on("line", (line) => {
  // If the line contains "West Bengal" or it's the header, keep it
  if (!headerSaved) {
    output.write(line + "\n");
    headerSaved = true;
  } else if (line.toLowerCase().includes("uttar pradesh")) {
    output.write(line + "\n");
  }
});

reader.on("close", () => {
  console.log(`✅ Filtered CSV written to: ${outputFile}`);
});
