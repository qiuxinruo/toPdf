const transformCanvas2Img = async (page, app) => {
  await page.evaluate(async () => {
    // 仅处理公文中的 canvas，如果碰到其它的场景下也有问题的话，需要额外的特殊处理
    const RENDERPDF = document.querySelector("#RENDERPDF");

    if (RENDERPDF) {
      const canvass = RENDERPDF.querySelectorAll("canvas");
      // 清除下面的所有子元素
      RENDERPDF.innerHTML = "";
      // 处理多个 canvas
      canvass.forEach((canvas) => {
        if (canvas) {
          if (canvas.width > 0 && canvas.height > 0) {
            const img = document.createElement("img");
            img.src = canvas.toDataURL("image/jpeg");
            img.style.width = Math.min(canvas.width, 595) + "px";
            img.style["max-height"] = "842px";
            // img.style.height = Math.min(canvas.height, 841) + "px";
            // 设置图片居中
            // RENDERPDF.style["text-align"] = "center";
            // RENDERPDF.style["overflow-x"] = "visible";

            const div = document.createElement("div");

            div.style.cssText = `
              // width: ${canvas.width}px;
              // height: ${canvas.height}px;
              box-sizing: border-box;
              display: flex;
              justify-content: center;
              margin: 50px auto;
            `;

            div.appendChild(img);

            RENDERPDF.appendChild(div);
          }
        }
      });

      // todo, 一段 hack 代码，待定位到具体的原因后，再优化掉
      if (canvass.length > 1) {
        // 增加空白图片，避免最后的图片被截断
        const img = document.createElement("img");
        // img.style.display = "none";
        img.style.height = "500px";
        img.src =
          "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
        RENDERPDF.appendChild(img);
      }
    }
  });
};

module.exports = transformCanvas2Img;
