const randomInt = (a, b) => {
  if (isNaN(b)) {
    b = a;
    a = 0;
  }
  return Math.floor(a + Math.random() * b);
};

const popIndex = (data, index) => {
  return data.splice(index, 1)[0];
};

const popRandom = (data) => {
  return popIndex(data, randomInt(data.length));
};

const shuffleArray = (data) => {
  const copy = [...data];
  const result = [];
  while (copy.length) {
    result.push(popRandom(copy));
  }
  return result;
};

module.exports = {
  randomInt,
  popIndex,
  popRandom,
  shuffleArray,
};
