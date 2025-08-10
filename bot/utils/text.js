function findCutPosition(text, maxLength) {
  let cut = text.lastIndexOf('\n', maxLength);
  if (cut >= maxLength * 0.75) return cut;

  cut = text.lastIndexOf('.', maxLength);
  if (cut >= maxLength * 0.75) return cut + 1;

  cut = text.lastIndexOf('!', maxLength);
  if (cut >= maxLength * 0.75) return cut + 1;

  cut = text.lastIndexOf('?', maxLength);
  if (cut >= maxLength * 0.75) return cut + 1;

  cut = text.lastIndexOf(' ', maxLength);
  if (cut > 0) return cut;

  return maxLength;
}

module.exports = { findCutPosition };
