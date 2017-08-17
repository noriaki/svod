const puppeteer = require('puppeteer');
const { enhance } = require('./crawler');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.setRequestInterceptionEnabled(true);
  page.on('request', (request) => {
    if (/\.(png|jpg|jpeg|gif|webp)$/.test(request.url)) {
      request.abort();
    } else {
      request.continue();
    }
  });
  const baseURL = 'https://www.happyon.jp';
  const genreURL = `${baseURL}/tiles/genres/animation`;
  const { visit } = enhance(page);
  await visit(genreURL, { waitUntil: 'networkidle' });
  await sleep(2000);
})().then(() => process.exit()).catch(error => console.log(error));

// error handling
process.on('unhandledRejection', (err) => {
  console.error(err);
  process.exit(1);
});

const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));
