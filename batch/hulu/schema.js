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

module.exports = {
  genreSchema,
  seriesSchema,
  seasonSchema,
  episodeSchema,
};
