const https = require('https');
const fs = require('fs');

const makeRequest = async (uri = '') => {
  console.log({ uri });
  return new Promise((resolve, reject) => {
    const req = https.get(`https://www.bonappetit.com${uri}`, res => {
      if (res.statusCode !== 200) {
        console.log(res.statusCode);
        reject('failed call');
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
            console.log("Got error: " + e.message);
          });
        });
        resolve(items[0].url);
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
  // one request every half second otherwise will hit the api request limit
  const interval = setInterval(() => {
    if (page > 1357) clearInterval(interval);
    makeRequest(`/api/search?page=${page}&size=10`);
    page++;
  }, 500);
}

downloadRecipes();