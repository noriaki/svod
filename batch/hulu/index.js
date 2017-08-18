const puppeteer = require('puppeteer');
const enhance = require('./crawler');

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
  await visit(genreURL);
  await sleep(2000);
})().then(() => process.exit()).catch(error => console.log(error));

// error handling
process.on('unhandledRejection', (err) => {
  console.error(err);
  process.exit(1);
});

const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));

const genres = [
  ["science_fiction", "SF"],
  ["human_drama", "ヒューマンドラマ"],
  ["animation", "アニメ"],
  ["action", "アクション"],
  ["comedy", "コメディ"],
  ["military_and_war", "戦争"],
  ["panic_and_disaster", "パニック"],
  ["suspense_mystery", "サスペンス／ミステリー"],
  ["adventure", "アドベンチャー"],
  ["fantasy", "ファンタジー"],
  ["westerns", "西部劇"],
  ["kids", "キッズ"],
  ["horror", "ホラー"],
  ["special_effects", "特撮"],
  ["coming_of_age", "青春"],
  ["romance", "恋愛"],
  ["japanese_period_drama", "時代劇"],
  ["music_live", "音楽／ライブ"],
  ["food", "料理"],
  ["sport", "スポーツ"],
  ["historical_drama", "史劇"],
  ["family", "ファミリー"],
  ["variety", "バラエティ"],
  ["documentary", "ドキュメンタリー"],
  ["other", "その他"],
  ["travel_hobby", "旅行／趣味"],
  ["reality_shows", "リアリティーショー"],
  ["news", "ニュース"],
];
