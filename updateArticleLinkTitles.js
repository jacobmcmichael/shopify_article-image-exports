import fetch from 'node-fetch';
import fs from 'fs';
import request from 'request';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local'});

const shop = process.env.SHOP_NAME;
const accessToken = process.env.API_KEY;

async function makeShopifyRequest(urlPath) {
  const url = `https://${shop}/admin/api/2023-07/${urlPath}`;
  console.log(url);

  const requestOptions = {
    url,
    headers: {
      'X-Shopify-Access-Token': accessToken,
    },
  };

  return new Promise((resolve, reject) => {
    request(requestOptions, (error, response, body) => {
      if (!error && response.statusCode === 200) {
        resolve(JSON.parse(body));
      } else {
        reject(error || 'Request failed');
      }
    });
  });
}

async function fetchBlogsWithHandle(handle) {
  try {
    const blogs = await makeShopifyRequest('blogs.json');
    const blog = blogs.blogs.find(blog => blog.handle === handle);
    return blog;
  } catch (error) {
    console.error(`Error fetching blogs: ${error}`);
    return null;
  }
}

async function fetchUnpublishedArticles(blogId) {
  try {
    const articles = await makeShopifyRequest(`blogs/${blogId}/articles.json?limit=1&status=unpublished`);
    return articles.articles;
  } catch (error) {
    console.error(`Error fetching unpublished articles: ${error}`);
    return null;
  }
}

async function updateArticleLinkTitles() {
  try {
    const studyHallBlog = await fetchBlogsWithHandle('study-hall');
    if (studyHallBlog) {
      const blogId = studyHallBlog.id;
      const unpublishedArticles = await fetchUnpublishedArticles(blogId);

      // Save fetched articles to a JSON file
      fs.writeFileSync('fetched_articles.json', JSON.stringify(unpublishedArticles, null, 2));

      const updatedArticles = [];

      for (const article of unpublishedArticles) {
        const { id, body_html } = article;
        const anchorRegex = /(<a\s+[^>]*href=)(["'])(.*?)\2([^>]*>)(.*?)<\/a>/g;

        const updatedBodyHtml = body_html.replace(anchorRegex, (match, startTag, quote, href, middle, text) => {
          const title = text || middle || href.split('/').filter(Boolean).pop().replace(/-/g, ' ');
          return `${startTag}${quote}${href}${quote} title="${title}"${middle}${text}</a>`;
        });

        updatedArticles.push({ ...article, body_html: updatedBodyHtml });
      }

      fs.writeFileSync('updated_articles.json', JSON.stringify(updatedArticles, null, 2));
    }
  } catch (error) {
    console.error(`Error updating article link titles: ${error}`);
  }
}

updateArticleLinkTitles();