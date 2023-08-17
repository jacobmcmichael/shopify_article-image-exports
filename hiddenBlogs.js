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
      url: `https://${shop}/admin/api/2023-07/${urlPath}`,
      headers: {
        'X-Shopify-Access-Token': accessToken,
      },
    }

    console.log(requestOptions.url);

    request(requestOptions, (error, response, body) => {
      if (!error && response.statusCode === 200) {
        resolve(JSON.parse(body))
      } else {
        reject(error || 'Request failed')
      }
    })
  })
}

async function fetchArticlesStatus(id) {
  try {
    if (!id) {
      console.log('No ID provided to fetch unpublished articles.');
      return;
    }

    const allArticles = await makeShopifyRequest(`blogs/${id}/articles/count.json?published_status=any`);
    const publishedArticles = await makeShopifyRequest(`blogs/${id}/articles/count.json?published_status=published`);
    const unpublishedArticles = await makeShopifyRequest(`blogs/${id}/articles/count.json?published_status=unpublished`);

    console.log('All Articles:', allArticles);
    console.log('Published Articles:', publishedArticles);
    console.log('Unpublished Articles:', unpublishedArticles);
  } catch (error) {
    console.log('Error fetching unpublished articles:', error);
  }
}

async function fetchBlogs() {
  try {
    const { blogs } = await makeShopifyRequest('blogs.json');
    const studyHallBlog = blogs.find((blog) => blog.handle === 'study-hall');
    
    if (studyHallBlog) {
      console.log(studyHallBlog.id);
      fetchArticlesStatus(studyHallBlog.id);
    } else {
      console.log('Study hall blog not found.');
    }
  } catch (error) {
    console.log('Error:', error);
  }
}

fetchBlogs();