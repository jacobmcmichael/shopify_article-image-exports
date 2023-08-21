import fs from 'fs'

fs.readFile('url_map_modified.json', 'utf8', (error, data) => {
  if (error) {
    console.error(error)
    return
  }

  const urlMap = JSON.parse(data)
  let csv = 'Redirect from,Redirect to\n'

  for (const [from, to] of Object.entries(urlMap)) {
    csv += `${from},${to}\n`
  }

  fs.writeFile('redirects.csv', csv, 'utf8', (error) => {
    if (error) {
      console.error(error)
      return
    }

    console.log('CSV file saved successfully.')
  })
})
