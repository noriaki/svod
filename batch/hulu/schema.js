const { Schema } = require('mongoose');

const genreSchema = new Schema({
  identifier: {
    type: String,
    index: true,
    required: true,
  },
  title: { type: String, index: true },
}, {
  timestamps: true,
});

const seriesSchema = new Schema({
  identifier: {
    type: String,
    index: true,
    required: true,
  },
  title: { type: String, index: true },
}, {
  timestamps: true,
});

const seasonSchema = new Schema({
  identifier: {
    type: String,
    index: true,
    required: true,
  },
  title: { type: String, index: true },
  index: Number,
}, {
  timestamps: true,
});

const episodeSchema = new Schema({
  identifier: {
    type: String,
    index: true,
    unique: true,
    required: true,
  },
  title: { type: String, index: true },
  index: Number,
  duration: Number,
  subtitled: Boolean,
  movie: Boolean,
  service: {
    type: String,
    index: true,
    enum: ['netflix', 'hulu', 'dtv', 'gyao', 'unext'],
  },
  active: {
    type: Boolean,
    index: true,
    default: false,
  },
  processing: {
    type: Boolean,
    index: true,
    default: true,
  },
  genres: [genreSchema],
  series: seriesSchema,
  season: seasonSchema,
}, {
  timestamps: true,
});

class Episode {
  static async firstOrCreate(query, doc) {
    const episode = await this.findOne(query);
    if (episode) { return { episode, newRecord: false }; }
    return { episode: this.create(doc), newRecord: true };
  }

  // return true if more than 20 hours passed or force
  isOld(now = Date.now(), force = false) {
    if (force) { return true; }
    const delta = new Date(now).getTime() - this.updatedAt.getTime();
    return delta > (20 * 60 * 60 * 1000);
  }
}
episodeSchema.loadClass(Episode);

module.exports = {
  genreSchema,
  seriesSchema,
  seasonSchema,
  episodeSchema,
};
