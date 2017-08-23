const partial = require('lodash.partial');

const host = 'www.happyon.jp';
const baseURL = `https://${host}`;
const loginURL = `${baseURL}/account/login`;
const profileGateURL = `${loginURL}/profiles/select`;
// const genreBaseURL = `${baseURL}/tiles/genres`;

const gotoAndWaitLoad = async (page, url, options = {}) => {
  await page.goto(url, { waitUntil: 'networkidle', ...options });
  await prepare(page);
};
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

const prepare = page => (
  page.evaluate(() => {
    const header = document.querySelector('header');
    if (header != null) { header.style.position = 'relative'; }
  })
);
module.prepare = prepare;

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

const waitForLoadItem = (page) => (page.waitFor(
  [
    '.vod-mod-no-result[style~="display:"][style~="block;"]',
    '.vod-mod-content .vod-mod-tile__item',
  ].join(),
  { timeout: 10000 }
));
module.waitForLoadItem = waitForLoadItem;

const selectSeasonTab = async (page, seasonId) => {
  const targetId = seasonId !== undefined ? seasonId : '';
  await page.click([
    '.vod-mod-tab__tabs[data-asset-tray-id-for="-1"]',
    ` > ul > li > button[value="${targetId}"]`,
  ].join(''));
  await waitForLoadItem(page);
}
module.selectSeasonTab = selectSeasonTab;

const getSeries = async (page) => {
  await waitForLoadItem(page);
  await domScrollToPageBottom(page);
  return page.evaluate(({ tileSelector, panelSelector }) => (
    [...document.querySelectorAll(tileSelector)].map(e => {
      const identifier = e.getAttribute('href').split('/').pop();
      const title = e.getAttribute('data-tracking-panel-title');
      const genres = [
        ...e.parentNode.querySelectorAll(panelSelector),
      ].map(link => {
        const identifier = link.getAttribute('href').split('/').pop();
        const title = link.textContent.trim();
        return { identifier, slug: identifier, title };
      })
      return { identifier, slug: identifier, title, genres };
    })
  ), {
    tileSelector: '.vod-mod-content .vod-mod-tile__item > a',
    panelSelector: '.vod-mod-popup-panel__information > li > a',
  });
};
module.getSeries = getSeries;

const getSeasons = async (page) => {
  await waitForLoadItem(page);
  const seasons = await page.evaluate(selector => (
    [...document.querySelectorAll(selector)].map((season, index) => {
      const identifier = season.getAttribute('value');
      const title = season.innerText.trim();
      return { identifier, slug: identifier, title, index };
    })
  ), '.vod-mod-tab__tabs[data-asset-tray-id-for="-1"] > ul > li > button:not([value=""])');
  return seasons.length > 0 ? seasons : [undefined];
};
module.getSeasons = getSeasons;

const getEpisodeIds = async (page) => {
  await waitForLoadItem(page);
  await domScrollToPageBottom(page);
  const paths = await page.evaluate(s => (
    [...document.querySelectorAll(s)].map(link => link.getAttribute('href'))
  ), '.vod-mod-content > [data-asset-tray-id="-1"] > .vod-mod-tile__item > a');
  return paths.map(path => path.split('/').pop());
};
module.getEpisodeIds = getEpisodeIds;

const hasSubtitled = async (page) => (
  Boolean(await page.$('input[name="subdub_type"]'))
);
module.hasSubtitled = hasSubtitled;

const changeSubtitled = async (page, value) => {
  // @value: enum ['subtitled', 'dubbed'] or undefined
  const cond = value !== undefined ? `[value="${value}"]` : ':not(:checked)';
  const element = await page.$(`input[name="subdub_type"]${cond}`);
  await element.evaluate(input => input.click());
};
module.changeSubtitled = changeSubtitled;

const enhance = page => ({
  gotoAndWaitLoad: partial(gotoAndWaitLoad, page),
  login: partial(login, page),
  selectProfile: partial(selectProfile, page),
  visit: partial(visit, page),
  prepare: partial(prepare, page),
  domScrollForPagination: partial(domScrollForPagination, page),
  domScrollToPageBottom: partial(domScrollToPageBottom, page),
  waitForLoadItem: partial(waitForLoadItem, page),
  selectSeasonTab: partial(selectSeasonTab, page),
  getSeries: partial(getSeries, page),
  getSeasons: partial(getSeasons, page),
  getEpisodeIds: partial(getEpisodeIds, page),
  hasSubtitled: partial(hasSubtitled, page),
  changeSubtitled: partial(changeSubtitled, page),
});
module.enhance = enhance;

module.exports = enhance;
