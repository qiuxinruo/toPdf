const transformOfficeContent = async (page, app) => {
  await page.evaluate(async () => {
    const printDom = document.querySelector("#printDom");

    if (printDom) {
      const img = document.createElement("img");
      img.style.height = "200px";
      img.src =
        "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
      printDom.appendChild(img);
    }
  });
};

module.exports = transformOfficeContent;
