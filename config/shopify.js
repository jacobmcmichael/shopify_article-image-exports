import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import Shopify from 'shopify-api-node'

const shopify = new Shopify({
  shopName: process.env.SHOP_NAME,
  accessToken: process.env.ACCESS_TOKEN,
  apiVersion: process.env.API_VERSION,
})

export default shopify
