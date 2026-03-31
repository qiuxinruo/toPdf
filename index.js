const fastify = require("fastify");

// const transformsTable = require("./public/transformTable.js");
const resetPageStyle = require("./public/resetPageStyle.js");
const resetTableStyle = require("./public/resetTableStyle.js");
const transformCanvas2Img = require("./public/transformCanvas2Img.js");
const transformOfficeContent = require("./public/transformOfficeContent.js");
// const removeOfficeDom = require("./public/removeOfficeDom.js");
// const scrollPageToBottom = require("./public/scrollPageToBottom.js");
const { skippedUrls, getBrowser } = require("./utils.js");

const app = fastify({
  // logger: true,
  logger: { level: "info", file: "/data/logs/topdf.log" },
});

const { log } = app;
const timeout = 60 * 1000;
let requestTotalTime = 0;

app.get("/health", async (_request, response) => {
  return response.code(200).send({
    code: 200,
    msg: "ok",
    data: {
      status: "up",
      service: "toPdf",
      timestamp: new Date().toISOString(),
    },
  });
});

app.get("/toPdf", async (request, response) => {
  const { url, fileName = "doc" } = request.query;

  log.info(`需转换 pdf 的链接地址: ${url}`);

  if (!url) {
    return response.send({
      code: 400,
      msg: "url 不能为空",
    });
  }

  let page;
  const start = Date.now(); // 记录开始时间
  try {
    const browser = await getBrowser();

    log.info(`实例化浏览器，耗时 ${Date.now() - start} 毫秒`);

    page = await browser.newPage();

    // 监听页面中的 console 信息
    // page.on("console", (msg) => {
    //   for (let i = 0; i < msg.args().length; ++i)
    //     console.log(`${i}: ${msg.args()[i]}`);
    //   console.log(`页面输出：${msg.text()}`);
    // });

    const promise1 = page.waitForNavigation({
      timeout,
      waitUntil: "networkidle0",
    });

    const promise2 = page.waitForNavigation({
      timeout,
      waitUntil: "domcontentloaded",
    });

    // 开启请求拦截
    await page.setRequestInterception(true);

    requestTotalTime = 0;

    // 定义response事件的回调函数
    const onResponse = (response) => {
      const endTime = Date.now();
      const requestTime = endTime - response.request().timing;

      // 将超过 500 ms 的请求打印出来，方便查询慢请求
      if (requestTime >= 0.5 * 1000) {
        log.warn(`URL: ${response.url()}, 请求时间: ${requestTime}ms`);
      }
      requestTotalTime += requestTime || 0;
    };

    // 监听请求事件
    page.on("request", (request) => {
      const url = request.url();

      // 判断请求的 URL，如果需要屏蔽，则中止请求
      if (skippedUrls.some((item) => url.includes(item))) {
        request.abort();
      } else {
        // 记录请求开始时间
        request.timing = Date.now();

        request.continue();

        // 移除上一次请求的response事件监听
        page.off("response", onResponse);

        // 监听response事件
        page.on("response", onResponse);
      }
    });

    await page.goto(url, {
      timeout,
    });

    // 重置页面样式，处理会议通知样式问题
    await resetPageStyle(page, app);

    // 重置表格样式
    await resetTableStyle(page, app);

    // 等待 dom 加载完成
    await promise2;

    log.info(`dom 加载完成，耗时 ${Date.now() - start} 毫秒`);

    // 等待网络空闲
    await promise1;

    log.info(`等待页面加载完成，耗时 ${Date.now() - start} 毫秒`);
    log.info(`所有的请求耗时合计 ${requestTotalTime} 毫秒`);

    // 模拟滚动条滚动到页面底部
    // await scrollPageToBottom(page, app);

    // 移除公文中的正文容器
    // await removeOfficeDom(page, app);

    // 转换表格内容
    // await transformTable(page, app);

    // canvas 无法正常转换成 pdf，需要先转图片，再转 pdf
    await transformCanvas2Img(page, app);

    // 处理公文正文可能存在遮挡的问题
    await transformOfficeContent(page, app);

    // const content = await page.content();

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });

    const end = Date.now(); // 记录结束时间
    const duration = end - start; // 计算时间差，即整个过程所需的时间
    log.info(`pdf 生成完成，耗时 ${duration} 毫秒`);

    response
      .code(200)
      .header("Content-Type", "application/pdf")
      .header("Content-Disposition", `attachment; filename="${fileName}.pdf"`)
      .send(pdfBuffer);
  } catch (error) {
    log.error(`转换过程中出现错误： ${error}`);
    response.code(500).send({ msg: "转换过程中出现错误", code: 500 });
  } finally {
    await page?.close();
  }
});

// 启动 Fastify 服务器
app.listen({ port: 3000, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    log.error(`启动服务器时出现错误：${err}`);
    process.exit(1);
  }

  log.info(`Server is now listening on ${address}`);
});
