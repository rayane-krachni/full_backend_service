const express = require("express");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const cors = require("cors");
const path = require("path");

let requestID;

(async () => {
  requestID = (await import("express-request-id")).default;
})();

const app = express();
require("./config");

// Wait for the dynamic import to resolve before using `requestID`
app.use((req, res, next) => {
  if (!requestID) {
    console.error("requestID is not defined yet!");
    return next(new Error("requestID is not initialized."));
  }
  requestID()(req, res, next);
});

app.use(logger("dev"));
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(
  "/data/static/public",
  express.static(path.join(process.cwd(), "data", "static", "public"))
);
// app.use((req, res, next) => {
//   const start = Date.now();

//   // Capture response data
//   const originalSend = res.send;
//   res.send = function (body) {
//     originalSend.call(this, body);
//     res.responseBody = body;
//   };
//   res.on("finish", () => {
//     if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH" || req.method === "GET") {
//       const duration = Date.now() - start;

//       const logEntry = {
//         timestamp: new Date().toISOString(),
//         method: req.method,
//         url: req.originalUrl,
//         status: res.statusCode,
//         duration: `${duration}ms`,
//         headers: req.headers,
//         query: req.query,
//         params: req.params,
//         body: req.body,
//         response: res.responseBody,
//         ip: req.ip || req.connection.remoteAddress,
//         userAgent: req.get("User-Agent"),
//       };

//       console.log(JSON.stringify(logEntry, null, 2));
//     }
//   });

//   next();
// });
// Health check endpoint for Fly.io
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

app.use(process.env.API_PREFIX, require("./routes"));

module.exports = app;
