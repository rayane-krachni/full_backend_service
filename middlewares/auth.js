const setAuthTarget = (target) => (req, res, next) => {
  
  req.authTarget = target;
  next();
};

const setTokenType = (type) => (req, res, next) => {
  req.tokenType = type;
  next();
};

const authorize =
  (...accountTypes) =>
    (req, res, next) => {
      if (accountTypes.includes(req.user?.accountType)) {
        next();
      } else {
        res.sendStatus(403);
      }
    };
module.exports = { setAuthTarget, setTokenType, authorize };
