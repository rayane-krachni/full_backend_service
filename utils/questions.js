const checkAnswer = (kind, content, answerContainer, answerKey) => {
  if (answerContainer[answerKey] === null) {
    return false;
  }
  if (
    answerContainer[answerKey] === "" ||
    answerContainer[answerKey] === undefined
  ) {
    answerContainer[answerKey] = null;
    return false;
  }
  switch (kind) {
    case "TF": {
      const answer = answerContainer[answerKey];
      if (typeof answer !== "boolean" && typeof answer !== "string") {
        answerContainer[answerKey] = null;
        return false;
      }
      if (typeof answer === "string") {
        if (answer.toLowerCase() === "true") {
          answerContainer[answerKey] = true;
        } else if (answer.toLowerCase() === "false") {
          answerContainer[answerKey] = false;
        } else {
          answerContainer[answerKey] = null;
          return false;
        }
      }
      return content.correctAnswer === answerContainer[answerKey];
    }
    case "UCQ": {
      if (
        !["string", "number"].includes(typeof answerContainer[answerKey]) ||
        isNaN(answerContainer[answerKey])
      ) {
        answerContainer[answerKey] = null;
        return false;
      }
      answerContainer[answerKey] = parseInt(answerContainer[answerKey]);
      if (
        isNaN(answerContainer[answerKey]) ||
        answerContainer[answerKey] < 0 ||
        answerContainer[answerKey] >= content.options.length
      ) {
        answerContainer[answerKey] = null;
        return false;
      }
      return content.options[answerContainer[answerKey]].isChecked === true;
    }
    case "MCQ": {
      if (
        answerContainer[answerKey]?.constructor.name !== "Array" ||
        !answerContainer[answerKey].length
      ) {
        answerContainer[answerKey] = null;
        return false;
      }
      return content.options.every((option, index) => {
        return (
          !!option.isChecked === answerContainer[answerKey].includes(index)
        );
      });
    }
    case "TEXT": {
      if (typeof answerContainer[answerKey] !== "string") {
        answerContainer[answerKey] = null;
        return false;
      }
      return content.correctAnswers
        .map((el) => el?.trim())
        .includes(answerContainer[answerKey].trim());
    }
    case "CORRECTION": {
      if (typeof answerContainer[answerKey] !== "string") {
        answerContainer[answerKey] = null;
        return false;
      }
      return content.correctAnswers
        .map((el) => el?.trim())
        .includes(answerContainer[answerKey].trim());
    }
    case "FITB": {
      if (
        answerContainer[answerKey]?.constructor.name !== "Array" ||
        !answerContainer[answerKey].length
      ) {
        answerContainer[answerKey] = null;
        return false;
      }
      let check = true;
      const items = content.item.filter((item) => item.kind === "BLANK");
      items.forEach((item, index) => {
        const isCorrect = checkAnswer(
          item.config.kind,
          item.config,
          answerContainer[answerKey],
          index
        );
        answerContainer[answerKey][index] = {
          isCorrect,
          value: answerContainer[answerKey][index],
        };
        check = check && isCorrect;
      });
      return check;
    }

    default:
      return null;
  }
};

const removeQuestionAnswers = (kind, content) => {
  if (kind?.constructor.name === "Array") {
    kind.forEach((question) => {
      removeQuestionAnswers(question.kind, question.content);
    });
    return;
  }
  switch (kind) {
    case "TF":
      delete content.correctAnswer;
      break;
    case "UCQ":
    case "MCQ":
      content.options.forEach((option) => {
        delete option.isChecked;
      });
      break;
    case "TEXT":
      delete content.correctAnswers;
      break;
    case "CORRECTION":
      delete content.correctAnswers;
      break;
    case "FITB":
      content.item.forEach((item) => {
        if (item.kind === "BLANK") {
          removeQuestionAnswers(item.config.kind, item.config);
        }
      });
      break;

    default:
      break;
  }
};

module.exports = { checkAnswer, removeQuestionAnswers };
