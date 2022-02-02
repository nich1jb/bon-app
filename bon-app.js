const https = require('https');
const fs = require('fs');

const makeRequest = async (uri = '') => {
  console.log(`starting request: ${uri}`);
  return new Promise((_, reject) => {
    const req = https.get(`https://www.bonappetit.com${uri}`, res => {
      if (res.statusCode !== 200) {
        reject(`failed call. response code: ${res.statusCode}`);
        return;
      }
      let data = [];
      res.on('data', chunk => {
        data.push(chunk);
      });

      res.on('end', () => {
        const result = JSON.parse(Buffer.concat(data).toString()); 

        const { items } = result;
        if (items.length === 0) {
          reject('no items');
          return;
        }
        items.forEach(item => {
          const { hed, publishHistory } = item;
          const { uri } = publishHistory;
          
          // write each recipe to an html file
          https.get(`https://www.bonappetit.com/${uri}`, res => {
            let recipeData = [];
            res.on('data', chunk => {
              recipeData.push(chunk);
            });
            res.on('end', () => {
              const body = Buffer.concat(recipeData).toString();
              fs.writeFile(`bon-app-recipes/${hed}.html`, body, (err) => {
                if (err)
                  console.log(err);
                else {
                  console.log(`File ${hed}.html written successfully\n`);
                }
              });
            });
          }).on('error', (e) => {
            reject(e.message);
          });
        });
      });
    }).on('error', err => {
      reject(err);
    });
    req.on('error', function(err) {
      reject(err);
    });
    req.end();
  });
}

const downloadRecipes = () => {
  var dir = './bon-app-recipes';

  if (!fs.existsSync(dir)){
      fs.mkdirSync(dir);
  }

  let page = 1;
  let noMoreItems = false;
  // one request every half second otherwise will hit the api request limit
  const interval = setInterval(() => {
    if (noMoreItems) clearInterval(interval);
    makeRequest(`/api/search?page=${page}&size=10`).catch(err => {
      if (err === 'no items') noMoreItems = true;
    });
    page++;
  }, 500);
}

downloadRecipes();
