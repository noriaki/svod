const puppeteer = require('puppeteer');
const enhance = require('./crawler');
const { createConnection } = require('../db');
const { episodeSchema } = require('./schema');

const connection = createConnection();
const HuluEpisode = connection.model('HuluEpisode', episodeSchema);

(async () => {
  const browser = await puppeteer.launch(/*{ headless: false }*/);
  const page = await browser.newPage();
  await page.setRequestInterceptionEnabled(true);
  page.on('request', (request) => {
    if (/\.(png|jpg|jpeg|gif|webp)($|[?#])/.test(request.url)) {
      request.abort();
    } else {
      request.continue();
    }
  });
  const service = 'hulu';
  const active = false;
  const processing = true;
  const baseURL = 'https://www.happyon.jp';
  const {
    visit,
    selectSeasonTab,
    getSeries,
    getSeasons,
    getEpisodeIds,
    hasSubtitled,
    changeSubtitled,
  } = enhance(page);

  const seriesIds = [];

  for (const [genreId, genreName] of genresSet) {
    console.log('## %s (%s)', genreName, genreId);
    const genreURL = `${baseURL}/tiles/genres/${genreId}`;
    await visit(genreURL);
    const seriesSet = await getSeries();

    for (const seriesPiece of seriesSet) {
      const { genres, ...series } = seriesPiece;
      if (seriesIds.includes(series.identifier)) {
        console.log('### %s (%s) skip', series.title, series.identifier);
        continue;
      } else {
        console.log('### %s (%s)', series.title, series.identifier);
      }
      const seriesURL =
              `${baseURL}/${series.identifier}/assets?asset_tray_id=-1`;
      await visit(seriesURL);
      const seasons = await getSeasons();

      for (const season of seasons) {
        let seasonId;
        // let seasonMongoObj;
        if (season !== undefined) {
          seasonId = season.identifier;
          console.log('#### %s (%s)', season.title, seasonId);
        }
        await selectSeasonTab(seasonId);
        const episodeIds = await getEpisodeIds();
        if (await hasSubtitled()) {
          await changeSubtitled();
          episodeIds.push(...(await getEpisodeIds()));
        }

        for (const identifier of episodeIds) {
          const episode = await HuluEpisode.findOneAndUpdate(
            { identifier },
            { identifier, service, genres, series, season, active, processing },
            { new: true, upsert: true, setDefaultsOnInsert: true }
          );
          console.log('%s: %s', episode.id, identifier);
        }
        await sleep(500);
      }
      seriesIds.push(series.identifier);
    }
  }
})().then(() => process.exit()).catch((error) => {
  console.log(error);
  process.exit(1);
});

// error handling
process.on('unhandledRejection', (error) => {
  console.error(error);
  process.exit(1);
});

const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));

const genresSet = [
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
