const puppeteer = require('puppeteer');

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
  const loginURL = `${baseURL}/account/login`;
  const profileGateURL = `${loginURL}/profiles/select`;
  await page.goto(genreURL, { waitUntil: 'networkidle' });
  if (await page.url() === loginURL) {
    await page.focus('#form_account_email');
    await page.type(process.env.SVOD_ACCOUNTS_HULU_ID);
    await page.focus('#form_account_password');
    await page.type(process.env.SVOD_ACCOUNTS_HULU_PW);
    await page.click('#new_form_account button[type=submit]');
  }
  if (await page.url() === profileGateURL) {
    const profiles = await page.evaluate(selector => (
      [...document.querySelectorAll(selector)].map(n => n.textContent.trim())
    ), '.vod-mod-profile__name');
    const i = profiles.findIndex(
      profile => profile === process.env.SVOD_ACCOUNTS_HULU_NAME
    );
    await page.click(
      `.vod-mod-profile-list__item:nth-child(${i + 1}) input[type=image]`
    );
  }
  await sleep(2000);
})().then(() => process.exit()).catch(error => console.log(error));

// error handling
process.on('unhandledRejection', (err) => {
  console.error(err);
  process.exit(1);
});

const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));
