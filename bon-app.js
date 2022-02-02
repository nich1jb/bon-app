const https = require('https');
const fs = require('fs');

const makeRequest = uri => {
  console.log(`starting request: ${uri}`);
  return new Promise((_, reject) => {
    const req = https.get(`https://www.bonappetit.com${uri}`, res => {
      const { statusCode } = res;
      if (statusCode !== 200) {
        reject(`failed call. response code: ${statusCode}`);
        return;
      }
      let data = [];
      res.on('data', chunk => {
        data.push(chunk);
      });

      res.on('end', () => {
        const { items } = JSON.parse(Buffer.concat(data).toString()); 

        if (!items.length) {
          reject('no items');
          return;
        }
        items.forEach(({ hed, publishHistory: { uri } }) => {
          // write each recipe to an html file
          https.get(`https://www.bonappetit.com/${uri}`, res => {
            let recipeData = [];
            res.on('data', chunk => {
              recipeData.push(chunk);
            });
            res.on('end', () => {
              const recipeHtml = Buffer.concat(recipeData).toString();
              fs.writeFile(`bon-app-recipes/${hed}.html`, recipeHtml, err => {
                if (err)
                  console.log(err);
                else {
                  console.log(`File ${hed}.html written successfully\n`);
                }
              });
            });
          }).on('error', ({ message }) => {
            reject(message);
          });
        });
      });
    }).on('error', err => {
      reject(err);
    });
    req.on('error', err => {
      reject(err);
    });
    req.end();
  });
}

const downloadRecipes = () => {
  const dir = './bon-app-recipes';

  if (!fs.existsSync(dir)){
      fs.mkdirSync(dir);
  }

  let page = 1;
  let noMoreItems = false;
  // one request every half second otherwise will hit the api request limit
  const interval = setInterval(() => {
    if (noMoreItems) clearInterval(interval);
    makeRequest(`/api/search?page=${page}`).catch(err => {
      if (err === 'no items') noMoreItems = true;
    });
    page++;
  }, 500);
}

downloadRecipes();
