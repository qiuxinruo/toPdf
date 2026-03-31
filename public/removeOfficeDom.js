const removeOfficeDom = async (page, app) => {
  const startTime = Date.now();

  await page.evaluate(async () => {
    return new Promise((resolve, reject) => {
      const officeDom = document.querySelector("#printDom");

      if (officeDom) {
        officeDom.remove();
      }

      resolve();
    });
  });

  app.log.info(`移除公文正文元素，耗时 ${Date.now() - startTime} 毫秒`);
};

module.exports = removeOfficeDom;
