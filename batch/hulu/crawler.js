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

const domScrollForPagination = page => (
  page.evaluate(() => window.scrollTo(0, document.body.scrollHeight - 1000))
)
module.domScrollForPagination = domScrollForPagination;

const domScrollToPageBottom = async (page) => {
  let inTheMiddle = true;
  while (inTheMiddle) {
    await domScrollForPagination(page);
    await page.waitFor(100);
    inTheMiddle = await page.evaluate(selector => (
      document.querySelector(selector).style.display !== 'none'
    ), '.vod-mod-loader');
  }
};
module.domScrollToPageBottom = domScrollToPageBottom;

const getSeries = async (page) => {
  await page.waitFor('.vod-mod-content .vod-mod-tile__item');
  await domScrollToPageBottom(page);
  return page.evaluate(({ tileSelector, panelSelector }) => (
    [...document.querySelectorAll(tileSelector)].map(e => {
      const id = e.getAttribute('href').split('/').pop();
      const title = e.getAttribute('data-tracking-panel-title');
      const genres = [...e.parentNode.querySelectorAll(panelSelector)].map(a => {
        const id = a.getAttribute('href').split('/').pop();
        const title = a.textContent.trim();
        return { id, slug: id, title };
      })
      return { id, slug: id, title, genres };
    })
  ), {
    tileSelector: '.vod-mod-content .vod-mod-tile__item > a',
    panelSelector: '.vod-mod-popup-panel__information > li > a',
  });
};
module.getSeries = getSeries;

const getSeasons = async (page) => {
  await page.waitFor('.vod-mod-content .vod-mod-tile__item');
  return page.evaluate(selector => (
    [...document.querySelectorAll(selector)].map(season => {
      const id = season.getAttribute('value');
      const title = season.innerText.trim();
      return { id, slug: id, title };
    })
  ), '.vod-mod-tab__tabs[data-asset-tray-id-for="-1"] > ul > li > button:not([value=""])');
};
module.getSeasons = getSeasons;

const getEpisodeIds = async (page, seasonId) => {
  if (seasonId != null) {
    await page.click([
      '.vod-mod-tab__tabs[data-asset-tray-id-for="-1"]',
      ` > ul > li > button[value="${seasonId}"]`,
    ].join(''));
  }
  await page.waitFor('.vod-mod-content .vod-mod-tile__item');
  await domScrollToPageBottom(page);
  const paths = await page.evaluate(s => (
    [...document.querySelectorAll(s)].map(link => link.getAttribute('href'))
  ), '.vod-mod-content > [data-asset-tray-id="-1"] > .vod-mod-tile__item > a');
  return paths.map(path => path.split('/').pop());
};
module.getEpisodeIds = getEpisodeIds;

const enhance = page => ({
  gotoAndWaitLoad: partial(gotoAndWaitLoad, page),
  login: partial(login, page),
  selectProfile: partial(selectProfile, page),
  visit: partial(visit, page),
  domScrollForPagination: partial(domScrollForPagination, page),
  domScrollToPageBottom: partial(domScrollToPageBottom, page),
  getSeries: partial(getSeries, page),
  getSeasons: partial(getSeasons, page),
  getEpisodeIds: partial(getEpisodeIds, page),
});
module.enhance = enhance;

module.exports = enhance;
