const partial = require('lodash.partial');

const host = 'www.happyon.jp';
const baseURL = `https://${host}`;
const loginURL = `${baseURL}/account/login`;
const profileGateURL = `${loginURL}/profiles/select`;
// const genreBaseURL = `${baseURL}/tiles/genres`;

const visit = async (page, url, options) => {
  if (url !== await page.url()) {
    await page.goto(url, options);
  } else {
    return;
  }
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
  if (url !== await page.url()) {
    await page.goto(url, options);
  }
};
module.visit = visit;

const enhance = page => ({
  visit: partial(visit, page),
});
module.enhance = enhance;

module.exports = {
  visit,
  enhance,
};
