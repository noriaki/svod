const partial = require('lodash.partial');

const host = 'www.happyon.jp';
const baseURL = `https://${host}`;
const loginURL = `${baseURL}/account/login`;
const profileGateURL = `${loginURL}/profiles/select`;
// const genreBaseURL = `${baseURL}/tiles/genres`;

const gotoAndWaitLoad = async (page, url, options = {}) => (
  await page.goto(url, { waitUntil: 'networkidle', ...options })
);
module.gotoAndWaitLoad = gotoAndWaitLoad;

const login = async (page) => {
  if (await page.url() !== loginURL) {
    await gotoAndWaitLoad(page, loginURL);
  }
  await page.focus('#form_account_email');
  await page.type(process.env.SVOD_ACCOUNTS_HULU_ID);
  await page.focus('#form_account_password');
  await page.type(process.env.SVOD_ACCOUNTS_HULU_PW);
  await page.click('#new_form_account button[type=submit]');
};
module.login = login;

const selectProfile = async (page) => {
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
module.selectProfile = selectProfile;

const visit = async (page, url, options) => {
  if (url !== await page.url()) {
    await gotoAndWaitLoad(page, url, options);
  } else {
    return;
  }
  if (await page.url() === loginURL) { await login(page); }
  if (await page.url() === profileGateURL) { await selectProfile(page); }
  if (url !== await page.url()) {
    await gotoAndWaitLoad(page, url, options);
  }
};
module.visit = visit;

const enhance = page => ({
  gotoAndWaitLoad: partial(gotoAndWaitLoad, page),
  login: partial(login, page),
  selectProfile: partial(selectProfile, page),
  visit: partial(visit, page),
});
module.enhance = enhance;

module.exports = enhance;
