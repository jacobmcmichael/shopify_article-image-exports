const fs = require('fs')

// Read the content of the text file
fs.readFile('image_urls_with_dimensions.txt', 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading the file:', err)
    return
  }

  // Define the base URL to remove
  const baseURL = 'https://hoss.slightsites.com'

  // Split the content by lines
  const lines = data.split('\n')

  // Process each line
  const modifiedLines = lines.map((line) => {
    // Replace the base URL with an empty string
    return line.replace(baseURL, '')
  })

  // Join the modified lines back into a single string
  const modifiedContent = modifiedLines.join('\n')

  // Write the modified content back to the file
  fs.writeFile('image_urls_with_removed_domain.txt', modifiedContent, 'utf8', (err) => {
    if (err) {
      console.error('Error writing to the file:', err)
      return
    }
    console.log('URLs have been modified and saved to modified-text-file.txt')
  })
})
