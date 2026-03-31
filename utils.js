const puppeteer = require("puppeteer");

let browser = null;

module.exports = {
  skippedUrls: [
    "access/SC/pollMsg",
    "at.alicdn.com",
    "sfs/avatar",
    "statics/cdn/images",
    "access/OfflineMsg",
    // "sfs/file", // 公文的红头文件，包含了 sfs/file 的路径，如果配置了，会导致公文的红头出不来
  ],
  async getBrowser() {
    if (!browser) {
      browser = await puppeteer.launch({
        ignoreHTTPSErrors: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
        ],
        headless: "new",
      });
    }
    return browser;
  },
  funcPromise(fnCode, page, app) {
    return new Promise((resolve, reject) => {
      eval(`(${fn})(page, app)`);
    });
  },
};
