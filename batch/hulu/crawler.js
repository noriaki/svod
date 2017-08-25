const partial = require('lodash.partial');
const fetch = require('node-fetch');

const host = 'www.happyon.jp';
const baseURL = `https://${host}`;
const loginURL = `${baseURL}/account/login`;
const profileGateURL = `${loginURL}/profiles/select`;
// const genreBaseURL = `${baseURL}/tiles/genres`;
const watchingsURL = `${baseURL}/profile/lists/watchings`;

const gotoAndWaitLoad = async (page, url, options = {}) => {
  await page.goto(url, { waitUntil: 'networkidle', ...options });
  await prepare(page);
};
module.gotoAndWaitLoad = gotoAndWaitLoad;

const login = async (page) => {
  if ((await page.url()) !== loginURL) {
    await gotoAndWaitLoad(page, loginURL);
    if ((await page.url()) !== loginURL) { return; }
  }
  await page.focus('#form_account_email');
  await page.type(process.env.SVOD_ACCOUNTS_HULU_ID);
  await page.focus('#form_account_password');
  await page.type(process.env.SVOD_ACCOUNTS_HULU_PW);
  await page.click('#new_form_account button[type=submit]');
  await page.waitForNavigation({ timeout: 10001 });
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
  await page.waitForNavigation({ timeout: 10002 });
}
module.selectProfile = selectProfile;

const isLoggedIn = page => page.evaluate(() => (
  Boolean(window.isLoggedIn) ||
    Boolean(document.querySelector('.vod-mod-header__user-menu button > span'))
));
module.isLoggedIn = isLoggedIn;

const visit = async (page, url, options) => {
  if (url !== (await page.url())) {
    await gotoAndWaitLoad(page, url, options);
  } else {
    return;
  }
  if (!await isLoggedIn(page) && (await page.url()) !== profileGateURL) {
    await login(page);
  }
  if ((await page.url()) === profileGateURL) {
    await selectProfile(page);
  }
  if (url !== (await page.url())) {
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
  page.evaluate(() => window.scrollTo(0, document.body.scrollHeight - 700))
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
    '.vod-mod-no-result--type02[style~="display:"][style~="block;"]',
    '.vod-mod-content .vod-mod-tile__item',
    '.vod-mod-content .vod-mod-tile02__item',
  ].join(),
  { timeout: 10003 }
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

const getTokenFromCookie = page => page.evaluate(() => (
  document.cookie.split('; ').find(c => /^token=/.test(c)).split('=').pop()
));
module.getTokenFromCookie = getTokenFromCookie;

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

const getEpisode = (page, episodeId, tokenFromCookie, tokenFromJson) => {
  const endpoint = 'https://api.happyon.jp/v1/playback/videos/';
  const token = tokenFromJson ? `&token=${tokenFromJson}` : '';
  const url = `${endpoint}${episodeId}?_=${Date.now()}${token}`;
  const headers = {
    'Accept-Language': 'ja',
    'Authorization': `extra ${tokenFromCookie}`,
    'Content-Type': 'application/json',
  };
  return fetch(url, { headers }).then(res => res.json());
};
module.getEpisode = getEpisode;

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

const resetWatchings = async (page) => {
  await visit(page, watchingsURL);
  await waitForLoadItem(page);
  if (await page.$('.vod-mod-content .vod-mod-tile02__item')) {
    await domScrollToPageBottom(page);
    await page.click('.vod-mod-tab__enable-delete-mode > button');
    await page.click('.vod-mod-tab__all-checked > button');
    await page.click('.vod-mod-tab__submit > button');
    await page.waitFor(
      '.vod-mod-no-result--type02[style~="display:"][style~="block;"]'
    );
  }
};
module.resetWatchings = resetWatchings;

const enhance = page => [
  gotoAndWaitLoad,
  login,
  selectProfile,
  isLoggedIn,
  visit,
  prepare,
  domScrollForPagination,
  domScrollToPageBottom,
  waitForLoadItem,
  selectSeasonTab,
  getTokenFromCookie,
  getSeries,
  getSeasons,
  getEpisodeIds,
  getEpisode,
  hasSubtitled,
  changeSubtitled,
  resetWatchings,
].reduce((methods, method) => {
  methods[method.name] = partial(method, page);
  return methods;
}, {});
module.enhance = enhance;

module.exports = enhance;
