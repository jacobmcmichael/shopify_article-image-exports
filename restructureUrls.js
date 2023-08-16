const fs = require('fs')

// Read the text file containing the URLs
const inputFile = 'image_urls_without_dimensions.txt'
const outputFile = 'image_urls_restructured.txt'
const cdnBaseUrl = 'https://cdn.shopify.com/s/files/1/0745/1957/6886/files/'

fs.readFile(inputFile, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading the file:', err)
    return
  }

  const urls = data.split('\n').filter((url) => url.trim() !== '')

  // Process each URL
  const modifiedUrls = urls.map((url) => {
    const parts = url.split('/')
    const fileNameWithExtension = parts.pop()
    const fileHandle = fileNameWithExtension.split('.')[0]
    const fileExtension = fileNameWithExtension.split('.')[1]

    const optimizedFileName = fileHandle + '--optimized.' + fileExtension
    const optimizedUrl = url.replace(fileNameWithExtension, optimizedFileName)
    const shopifyCdnUrl = cdnBaseUrl + optimizedFileName

    return shopifyCdnUrl
  })

  // Write the modified URLs to the output file
  fs.writeFile(outputFile, modifiedUrls.join('\n'), 'utf8', (err) => {
    if (err) {
      console.error('Error writing to the file:', err)
      return
    }
    console.log('Modified URLs written to', outputFile)
  })
})
