const slugifyLib = require("slugify");
const { v4: uuidv4 } = require("uuid");

const createSlug = (text) => {
  return slugifyLib(text, { lower: true, strict: true, trim: true });
};

const createUniqueSlug = (text) => {
  const base = createSlug(text);
  const uid = uuidv4().split("-")[0];
  return `${base}-${uid}`;
};

module.exports = { createSlug, createUniqueSlug };
