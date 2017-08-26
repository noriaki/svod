const puppeteer = require('puppeteer');
const enhance = require('./crawler');
const { createConnection } = require('../db');
const { episodeSchema } = require('./schema');
const { postMessage, buildMessage, buildErrorMessage } = require('../slack');

(async () => {
  const connection = await createConnection();
  const HuluEpisode = connection.model('HuluEpisode', episodeSchema);

  // const browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox'] });
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setRequestInterceptionEnabled(true);
  page.on('request', (request) => {
    if (/\.(png|jpg|jpeg|gif|webp)($|[?#])/.test(request.url)) {
      request.abort();
    } else if (/^https?:\/\/([^/]*\.|)happyon\.jp\//.test(request.url)) {
      request.continue();
    } else {
      request.abort();
    }
  });
  const active = true;
  const processing = false;
  const baseURL = 'https://www.happyon.jp/';
  const { visit, getTokenFromCookie, getEpisode } = enhance(page);

  await postMessage(buildMessage({
    title: 'Start to retrieving episode detail', text: '',
  }));

  let episode = await HuluEpisode.findOne({ processing: true });
  await postMessage(buildMessage({
    title: 'Retrieve episode',
    text: episode.identifier,
    color: '#439FE0',
  }));
  let token;
  await visit(baseURL);
  while (episode) {
    const tokenFromCookie = await getTokenFromCookie();
    console.log(tokenFromCookie);
    const data = await getEpisode(episode.identifier, tokenFromCookie, token);
    console.log(data);
    await episode.update({ active, processing, ...videoInfo(data.video) });
    console.log('%s: %s', episode.id, episode.identifier);
    episode = await HuluEpisode.findOne({ processing: true });
    token = data.token;
    sleep(200);
  }
})().then(() => process.exit()).catch((error) => {
  console.log(error);
  postMessage(buildErrorMessage(error)).then(() => process.exit(1));
});

// error handling
process.on('unhandledRejection', (error) => {
  console.error(error);
  postMessage(buildErrorMessage(error)).then(() => process.exit(1));
});

const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));

const splitTitle = name => {
  const m = name.match(/^\((字|吹)\)\s+(.*)$/);
  if (m && m.length === 3) {
    return { title: m[2], subtitled: m[1] === '字' };
  } else {
    return { title: name, subtitled: null };
  }
};

const getInfoByTitle = titles => {
  const [info] = titles.pop().split(' / ');
  const m = info.match(/第(\d+)話$/);
  return {
    movie: /^映画,/.test(info),
    index: m && m.length === 2 ? parseInt(m[1], 10) - 1 : null,
  };
}

const videoInfo = video => {
  const { title, subtitled } = splitTitle(video.name);
  const { index, movie } = getInfoByTitle(video.display_title);
  return { title, subtitled, index, movie };
};
