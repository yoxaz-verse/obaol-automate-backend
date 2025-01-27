#!/bin/bash

# Output file
output_file="combined_script.sh"

# Clear the output file
echo "#!/bin/bash" > "$output_file"

# Add all files recursively
find src -type f \( -name "*.ts" -o -name "*.js" \) | while read file; do
    echo -e "\n# ----- Start of $file -----\n" >> "$output_file"
    cat "$file" >> "$output_file"
    echo -e "\n# ----- End of $file -----\n" >> "$output_file"
done

# Make the output script executable
chmod +x "$output_file"

echo "Combined all files into $output_file."
