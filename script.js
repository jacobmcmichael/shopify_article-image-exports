const request = require('request')
const fs = require('fs')
const cheerio = require('cheerio')
const path = require('path')
const https = require('https')
const sharp = require('sharp')
const dotenv = require('dotenv').config({ path: '.env.local' })

const shop = process.env.SHOP_NAME
const accessToken = process.env.API_KEY

function makeShopifyRequest(urlPath) {
  return new Promise((resolve, reject) => {
    const requestOptions = {
      url: `https://${shop}/admin/api/2023-01/${urlPath}`,
      headers: {
        'X-Shopify-Access-Token': accessToken,
      },
    }

    request(requestOptions, (error, response, body) => {
      if (!error && response.statusCode === 200) {
        resolve(JSON.parse(body))
      } else {
        reject(error || 'Request failed')
      }
    })
  })
}

function extractImageUrlsFromHtml(html) {
  const $ = cheerio.load(html)
  const imgUrlsWithDimensions = []
  const imgUrlsWithoutDimensions = []

  $('img').each((index, element) => {
    const src = $(element).attr('src')
    if (src) {
      const imageUrlWithDimensions = src
      const imageUrlWithoutDimensions = src.replace(/(-\d+x\d+)?(\.\w+)$/, '$2')
      imgUrlsWithDimensions.push(
        imageUrlWithDimensions.replace('https://hosstools.com/', 'https://hoss.slightsites.com/')
      )
      imgUrlsWithoutDimensions.push(
        imageUrlWithoutDimensions.replace('https://hosstools.com/', 'https://hoss.slightsites.com/')
      )
    }
  })

  return [imgUrlsWithDimensions, imgUrlsWithoutDimensions]
}

async function optimizeImage(inputPath, outputPath) {
  try {
    await sharp(inputPath).resize({ width: 800 }).toFile(outputPath)
  } catch (err) {
    console.error('Error optimizing image:', err)
    console.log('Input path:', inputPath)
  }
}

async function processBlogs() {
  const { blogs } = await makeShopifyRequest('blogs.json')
  const studyHallBlogs = blogs.filter((blog) => blog.handle === 'study-hall')

  const uniqueImageUrlsWithDimensions = new Set()
  const uniqueImageUrlsWithoutDimensions = new Set()
  let processedBlogs = 0

  const originalImageFolder = 'downloaded_images/original'
  const optimizedImageFolder = 'downloaded_images/optimized'

  // Delete pre-existing files
  function deleteExistingFiles(folder) {
    if (fs.existsSync(folder)) {
      fs.readdirSync(folder).forEach((file) => {
        fs.unlinkSync(path.join(folder, file))
      })
    }
  }

  deleteExistingFiles(originalImageFolder)
  deleteExistingFiles(optimizedImageFolder)

  // Create folders if they don't exist
  function createFolderIfNotExists(folder) {
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true })
    }
  }

  createFolderIfNotExists(originalImageFolder)
  createFolderIfNotExists(optimizedImageFolder)

  for (const blog of studyHallBlogs) {
    const { articles } = await makeShopifyRequest(`blogs/${blog.id}/articles.json?limit=250`)

    for (const article of articles) {
      const [imgUrlsWithDimensions, imgUrlsWithoutDimensions] = extractImageUrlsFromHtml(article.body_html)
      imgUrlsWithDimensions.forEach((imageUrl) => uniqueImageUrlsWithDimensions.add(imageUrl))
      imgUrlsWithoutDimensions.forEach((imageUrl) => uniqueImageUrlsWithoutDimensions.add(imageUrl))
    }

    processedBlogs++

    if (processedBlogs === studyHallBlogs.length) {
      const allImageUrlsWithDimensions = [...uniqueImageUrlsWithDimensions]
      const allImageUrlsWithoutDimensions = [...uniqueImageUrlsWithoutDimensions]
      fs.writeFileSync('image_urls_with_dimensions.txt', allImageUrlsWithDimensions.join('\n'))
      fs.writeFileSync('image_urls_without_dimensions.txt', allImageUrlsWithoutDimensions.join('\n'))
      console.log('Image URLs saved to text files')

      try {
        const downloadPromises = allImageUrlsWithoutDimensions.map(async (imageUrl) => {
          const filename = path.basename(imageUrl)
          const originalImagePath = path.join(originalImageFolder, filename)
          const optimizedImagePath = path.join(
            optimizedImageFolder,
            `${filename.replace(/\.\w+$/, '')}--optimized${path.extname(filename)}`
          )

          const originalFile = fs.createWriteStream(originalImagePath)

          await new Promise((resolve, reject) => {
            https
              .get(imageUrl, (response) => {
                response.pipe(originalFile)
                response.on('end', resolve)
              })
              .on('error', (error) => {
                console.error('Error downloading image:', error)
                reject(error)
              })
          })

          return { originalImagePath, optimizedImagePath }
        })

        const imagePaths = await Promise.all(downloadPromises)

        await Promise.all(
          imagePaths.map(({ originalImagePath, optimizedImagePath }) =>
            optimizeImage(originalImagePath, optimizedImagePath)
          )
        )

        const originalFileCount = fs.readdirSync(originalImageFolder).length
        const optimizedFileCount = fs.readdirSync(optimizedImageFolder).length
        console.log(`Total original files: ${originalFileCount}`)
        console.log(`Total optimized files: ${optimizedFileCount}`)
        console.log('All images downloaded and optimized to the "downloaded_images" folder')
      } catch (error) {
        console.error('Error during download and optimization:', error)
      }
    }
  }
}

processBlogs()
