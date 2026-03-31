const scrollPageToBottom = async (page, app) => {
  const startTime = Date.now();

  await page.evaluate(async () => {
    return new Promise((resolve, reject) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.documentElement.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });

  app.log.info(`滚动页面到底部，耗时 ${Date.now() - startTime} 毫秒`);
};

module.exports = scrollPageToBottom;
