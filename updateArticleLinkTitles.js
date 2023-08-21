import fs from 'fs'
import request from 'request'
import cheerio from 'cheerio'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const shop = process.env.SHOP_NAME
const accessToken = process.env.API_KEY

async function makeShopifyRequest(urlPath) {
  const url = `https://${shop}/admin/api/2023-07/${urlPath}`
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

async function fetchUnpublishedArticles(blogId) {
  try {
    const articles = await makeShopifyRequest(`blogs/${blogId}/articles.json?limit=250&status=unpublished`)
    return articles.articles
  } catch (error) {
    console.error(`Error fetching unpublished articles: ${error}`)
    return null
  }
}

async function backupArticles(articles, filename) {
  const backup = JSON.stringify(articles)
  fs.writeFileSync(filename, backup)
}

async function updateArticleLinkTitles() {
  try {
    const studyHallBlog = await fetchBlogsWithHandle('study-hall')
    if (studyHallBlog) {
      const blogId = studyHallBlog.id
      const unpublishedArticles = await fetchUnpublishedArticles(blogId)
      const backupFilename = 'articles_backup.json'

      await backupArticles(unpublishedArticles, backupFilename)

      const updatedArticles = []
      const uniqueUrls = new Set()

      for (const article of unpublishedArticles) {
        const { id, body_html } = article
        const $ = cheerio.load(body_html)

        $('a').each((index, element) => {
          const $anchor = $(element)
          const href = $anchor.attr('href')

          if (href) {
            uniqueUrls.add(href)
          }
        })

        updatedArticles.push({ id, body_html })
      }

      const urlMap = {}
      for (const url of uniqueUrls) {
        urlMap[url] = ''
      }

      await backupArticles(updatedArticles, backupFilename)
    }
  } catch (error) {
    console.error(error)
  }
}

updateArticleLinkTitles()
