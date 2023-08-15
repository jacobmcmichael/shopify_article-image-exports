const request = require('request')
const fs = require('fs')
const cheerio = require('cheerio')
const path = require('path')
const https = require('https')

const shop = 'hosstoolsstore.myshopify.com'
const accessToken = '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'

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

  // Set to store unique image URLs
  const uniqueImageUrls = new Set()

  // Counter to keep track of processed blogs
  let processedBlogs = 0

  // Iterate through study hall blogs
  studyHallBlogs.forEach((blog) => {
    // Retrieve articles for each study hall blog
    makeShopifyRequest(`blogs/${blog.id}/articles.json?limit=250`, ({ articles }) => {
      articles.forEach((article) => {
        const imageUrls = extractImageUrlsFromHtml(article.body_html)
        imageUrls.forEach((imageUrl) => {
          uniqueImageUrls.add(imageUrl) // Add to the set to ensure uniqueness
        })
      })

      // Check if all blogs have been processed
      processedBlogs++
      if (processedBlogs === studyHallBlogs.length) {
        const allImageUrls = [...uniqueImageUrls] // Convert Set to an array

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
          const filename = path.basename(imageUrl)
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
