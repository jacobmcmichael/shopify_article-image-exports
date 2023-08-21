import fs from 'fs'
import request from 'request'
import dotenv from 'dotenv'
import shopify from './config/shopify.js'

dotenv.config({ path: '.env.local' })

const shop = 'hosstoolsstore.myshopify.com'
const accessToken = process.env.ACCESS_TOKEN
const apiVersion = process.env.API_VERSION

async function makeShopifyRequest(urlPath) {
  const url = `https://${shop}/admin/api/${apiVersion}/${urlPath}`
  console.log(url)

  const requestOptions = {
    url,
    headers: {
      'X-Shopify-Access-Token': accessToken,
    },
  }

  return new Promise((resolve, reject) => {
    request(requestOptions, (error, response, body) => {
      if (!error && response.statusCode === 200) {
        resolve(JSON.parse(body))
      } else {
        reject(error || 'Request failed')
      }
    })
  })
}

async function fetchBlogsWithHandle(handle) {
  try {
    const blogs = await makeShopifyRequest('blogs.json')
    const blog = blogs.blogs.find((blog) => blog.handle === handle)
    return blog
  } catch (error) {
    console.error(`Error fetching blogs: ${error}`)
    return null
  }
}

async function updateArticles(limit = 250) {
  try {
    const studyHallBlog = await fetchBlogsWithHandle('study-hall')
    if (studyHallBlog) {
      const blogId = studyHallBlog.id
      const updatedArticles = JSON.parse(fs.readFileSync('updated_articles.json', 'utf8'))

      for (let i = 0; i < Math.min(updatedArticles.length, limit); i++) {
        const { id, body_html, title } = updatedArticles[i]

        try {
          await shopify.article.update(blogId, id, { body_html })
          console.log(`Updated article: ${id} - ${title}`)
        } catch (error) {
          console.error(`Failed to update article: ${id} - ${title}`)
        }
      }
    }
  } catch (error) {
    console.error(error)
  }
}

updateArticles(250)
