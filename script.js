const dotenv = require('dotenv').config({ path: '.env.local' })
const request = require('request')
const fs = require('fs')
const cheerio = require('cheerio')
const path = require('path')
const https = require('https')

// Define the environment variables in a .env.local file
const shop = process.env.SHOP_NAME
const accessToken = process.env.API_KEY

console.log('Starting script...')
console.log(`SHOP_NAME: ${shop}`)
console.log(`API_KEY: ${accessToken}`)

// Reusable function to make Shopify API requests
function makeShopifyRequest(urlPath, callback) {
  const requestOptions = {
    url: `https://${shop}/admin/api/2023-01/${urlPath}`,
    headers: {
      'X-Shopify-Access-Token': accessToken,
    },
  }

  // Make the request
  request(requestOptions, (error, response, body) => {
    if (!error && response.statusCode === 200) {
      // If successful, parse the body and call the provided callback
      callback(JSON.parse(body))
    } else {
      console.error('Request failed')
    }
  })
}

// Function to extract URLs from img tags
function extractImageUrlsFromHtml(html) {
  const $ = cheerio.load(html)
  const imgUrls = []

  $('img').each((index, element) => {
    const src = $(element).attr('src')
    if (src) {
      imgUrls.push(src.replace('https://hosstools.com/', 'https://hoss.slightsites.com/'))
    }
  })

  return imgUrls
}

// Retrieve all blogs
makeShopifyRequest('blogs.json', ({ blogs }) => {
  // Filter blogs with the handle 'study-hall'
  const studyHallBlogs = blogs.filter((blog) => blog.handle === 'study-hall')

  // Array to store all image URLs
  const allImageUrls = []

  // Counter to keep track of processed blogs
  let processedBlogs = 0

  // Iterate through study hall blogs
  studyHallBlogs.forEach((blog) => {
    // Retrieve articles for each study hall blog
    makeShopifyRequest(`blogs/${blog.id}/articles.json`, ({ articles }) => {
      articles.forEach((article) => {
        const imageUrls = extractImageUrlsFromHtml(article.body_html)
        allImageUrls.push(...imageUrls)
      })

      // Check if all blogs have been processed
      processedBlogs++
      if (processedBlogs === studyHallBlogs.length) {
        // Write all image URLs to a text file
        fs.writeFileSync('image_urls.txt', allImageUrls.join('\n'))
        console.log('Image URLs saved to image_urls.txt')

        // Create a folder to save images
        const imageFolder = 'downloaded_images'
        if (!fs.existsSync(imageFolder)) {
          fs.mkdirSync(imageFolder)
        }

        // Download all images
        allImageUrls.forEach((imageUrl) => {
          const filename = path.basename(imageUrl) // Get the filename from the URL
          const imagePath = path.join(imageFolder, filename)

          const file = fs.createWriteStream(imagePath)
          https.get(imageUrl, (response) => {
            response.pipe(file)
          })
        })

        console.log('All images downloaded to the "downloaded_images" folder')
      }
    })
  })
})
