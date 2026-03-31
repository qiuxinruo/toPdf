const fastify = require("fastify");

// const transformsTable = require("./public/transformTable.js");
const resetPageStyle = require("./public/resetPageStyle.js");
const resetTableStyle = require("./public/resetTableStyle.js");
const transformCanvas2Img = require("./public/transformCanvas2Img.js");
const transformOfficeContent = require("./public/transformOfficeContent.js");
// const removeOfficeDom = require("./public/removeOfficeDom.js");
const scrollPageToBottom = require("./public/scrollPageToBottom.js");
const { skippedUrls, getBrowser } = require("./utils.js");

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const LOG_LEVEL = process.env.LOG_LEVEL || "info";
const LOG_DIR = process.env.LOG_DIR || "/data/logs";
const LOG_FILE = `${LOG_DIR}/topdf.log`;
const DEFAULT_TIMEOUT = 60 * 1000;

const app = fastify({
  // logger: true,
  logger: { level: LOG_LEVEL, file: LOG_FILE },
});

const { log } = app;
let requestTotalTime = 0;

const getRequestOptions = (request) => {
  if (request.method === "GET") {
    return {
      url: request.query.url,
      fileName: request.query.fileName || "doc",
      scrollToBottom: false,
      headers: {},
      cookies: [],
      timeout: DEFAULT_TIMEOUT,
      enableRequestInterception: true,
    };
  }

  const body = request.body || {};

  return {
    url: body.url,
    fileName: body.fileName || "doc",
    scrollToBottom: Boolean(body.scrollToBottom),
    headers: body.headers || {},
    cookies: Array.isArray(body.cookies) ? body.cookies : [],
    timeout: Number(body.timeout) > 0 ? Number(body.timeout) : DEFAULT_TIMEOUT,
    enableRequestInterception:
      body.enableRequestInterception === undefined
        ? true
        : Boolean(body.enableRequestInterception),
  };
};

const validateCookies = (cookies) => {
  return cookies.every(
    (item) =>
      item &&
      typeof item.name === "string" &&
      typeof item.value === "string" &&
      (typeof item.url === "string" ||
        (typeof item.domain === "string" && typeof item.path === "string"))
  );
};

const sendBadRequest = (response, msg) => {
  return response.code(400).send({
    code: 400,
    msg,
  });
};

const renderPdf = async (options, response) => {
  const {
    url,
    fileName,
    scrollToBottom,
    headers,
    cookies,
    timeout,
    enableRequestInterception,
  } = options;

  log.info(`需转换 pdf 的链接地址: ${url}`);

  if (!url) {
    return sendBadRequest(response, "url 不能为空");
  }

  if (headers && typeof headers !== "object") {
    return sendBadRequest(response, "headers 必须是对象");
  }

  if (!Array.isArray(cookies)) {
    return sendBadRequest(response, "cookies 必须是数组");
  }

  if (!validateCookies(cookies)) {
    return sendBadRequest(
      response,
      "cookies 格式不正确，需包含 name/value 和 url 或 domain+path"
    );
  }

  let page;
  const start = Date.now();

  try {
    const browser = await getBrowser();

    log.info(`实例化浏览器，耗时 ${Date.now() - start} 毫秒`);

    page = await browser.newPage();

    if (headers && Object.keys(headers).length > 0) {
      await page.setExtraHTTPHeaders(headers);
    }

    if (cookies.length > 0) {
      await page.setCookie(...cookies);
    }

    const promise1 = page.waitForNavigation({
      timeout,
      waitUntil: "networkidle0",
    });

    const promise2 = page.waitForNavigation({
      timeout,
      waitUntil: "domcontentloaded",
    });

    requestTotalTime = 0;

    if (enableRequestInterception) {
      await page.setRequestInterception(true);

      const onResponse = (response) => {
        const endTime = Date.now();
        const requestTime = endTime - response.request().timing;

        if (requestTime >= 0.5 * 1000) {
          log.warn(`URL: ${response.url()}, 请求时间: ${requestTime}ms`);
        }
        requestTotalTime += requestTime || 0;
      };

      page.on("request", (request) => {
        const requestUrl = request.url();

        if (skippedUrls.some((item) => requestUrl.includes(item))) {
          request.abort();
        } else {
          request.timing = Date.now();
          request.continue();
          page.off("response", onResponse);
          page.on("response", onResponse);
        }
      });
    }

    await page.goto(url, { timeout });

    await resetPageStyle(page, app);
    await resetTableStyle(page, app);

    await promise2;

    log.info(`dom 加载完成，耗时 ${Date.now() - start} 毫秒`);

    await promise1;

    log.info(`等待页面加载完成，耗时 ${Date.now() - start} 毫秒`);
    log.info(`所有的请求耗时合计 ${requestTotalTime} 毫秒`);

    if (scrollToBottom) {
      await scrollPageToBottom(page, app);
    }

    await transformCanvas2Img(page, app);
    await transformOfficeContent(page, app);

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });

    const end = Date.now();
    const duration = end - start;
    log.info(`pdf 生成完成，耗时 ${duration} 毫秒`);

    return response
      .code(200)
      .header("Content-Type", "application/pdf")
      .header("Content-Disposition", `attachment; filename="${fileName}.pdf"`)
      .send(pdfBuffer);
  } catch (error) {
    log.error(`转换过程中出现错误： ${error}`);
    return response.code(500).send({ msg: "转换过程中出现错误", code: 500 });
  } finally {
    await page?.close();
  }
};

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

app.get("/debug", async (_request, reply) => {
  return reply.type("text/html; charset=utf-8").send(`<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>toPdf Debug</title>
    <style>
      body { font-family: Arial, sans-serif; max-width: 720px; margin: 40px auto; padding: 0 16px; }
      label { display: block; margin: 12px 0 6px; font-weight: 600; }
      input, textarea, select { width: 100%; padding: 10px; box-sizing: border-box; }
      .row { display: flex; gap: 16px; }
      .row > div { flex: 1; }
      .actions { margin-top: 20px; }
      button { padding: 10px 18px; cursor: pointer; }
      .hint { color: #666; font-size: 13px; margin-top: 4px; }
      pre { background: #f6f8fa; padding: 12px; overflow: auto; }
    </style>
  </head>
  <body>
    <h1>toPdf 调试页面</h1>
    <p>使用这个页面可以直接在浏览器中测试 <code>POST /toPdf</code>。</p>

    <form id="pdf-form">
      <label for="url">目标 URL</label>
      <input id="url" name="url" type="url" placeholder="https://example.com" required />

      <label for="fileName">文件名</label>
      <input id="fileName" name="fileName" type="text" value="doc" />

      <div class="row">
        <div>
          <label for="timeout">超时时间（毫秒）</label>
          <input id="timeout" name="timeout" type="number" value="60000" min="1000" />
        </div>
        <div>
          <label for="scrollToBottom">滚动到底部</label>
          <select id="scrollToBottom" name="scrollToBottom">
            <option value="false">false</option>
            <option value="true">true</option>
          </select>
        </div>
      </div>

      <label for="enableRequestInterception">开启请求拦截</label>
      <select id="enableRequestInterception" name="enableRequestInterception">
        <option value="true">true</option>
        <option value="false">false</option>
      </select>

      <label for="headers">Headers（JSON）</label>
      <textarea id="headers" name="headers" rows="6" placeholder='{"Authorization":"Bearer xxx"}'></textarea>
      <div class="hint">请输入 JSON 对象格式。</div>

      <label for="cookies">Cookies（JSON）</label>
      <textarea id="cookies" name="cookies" rows="8" placeholder='[{"name":"token","value":"xxx","url":"https://example.com"}]'></textarea>
      <div class="hint">请输入 JSON 数组，每项需包含 name/value 和 url 或 domain+path。</div>

      <div class="actions">
        <button type="submit">生成 PDF</button>
      </div>
    </form>

    <h2>请求体预览</h2>
    <pre id="payload-preview"></pre>

    <script>
      const form = document.getElementById("pdf-form");
      const preview = document.getElementById("payload-preview");

      const buildPayload = () => {
        const formData = new FormData(form);
        const headersText = formData.get("headers").trim();
        const cookiesText = formData.get("cookies").trim();

        return {
          url: formData.get("url"),
          fileName: formData.get("fileName") || "doc",
          timeout: Number(formData.get("timeout")) || 60000,
          scrollToBottom: formData.get("scrollToBottom") === "true",
          enableRequestInterception: formData.get("enableRequestInterception") === "true",
          headers: headersText ? JSON.parse(headersText) : {},
          cookies: cookiesText ? JSON.parse(cookiesText) : [],
        };
      };

      const refreshPreview = () => {
        try {
          preview.textContent = JSON.stringify(buildPayload(), null, 2);
        } catch (error) {
          preview.textContent = "JSON 解析失败：" + error.message;
        }
      };

      form.addEventListener("input", refreshPreview);
      refreshPreview();

      form.addEventListener("submit", async (event) => {
        event.preventDefault();

        let payload;
        try {
          payload = buildPayload();
        } catch (error) {
          alert("请求参数 JSON 格式错误：" + error.message);
          return;
        }

        try {
          const response = await fetch("/toPdf", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            const text = await response.text();
            throw new Error(text || "HTTP " + response.status);
          }

          const blob = await response.blob();
          const downloadUrl = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = downloadUrl;
          a.download = (payload.fileName || "doc") + ".pdf";
          a.click();
          URL.revokeObjectURL(downloadUrl);
        } catch (error) {
          alert("生成失败：" + error.message);
        }
      });
    </script>
  </body>
</html>`);
});

app.get("/toPdf", async (request, response) => {
  return renderPdf(getRequestOptions(request), response);
});

app.post("/toPdf", async (request, response) => {
  return renderPdf(getRequestOptions(request), response);
});

app.listen({ port: PORT, host: HOST }, (err, address) => {
  if (err) {
    log.error(`启动服务器时出现错误：${err}`);
    process.exit(1);
  }

  log.info(`Server is now listening on ${address}`);
  log.info(`日志文件路径: ${LOG_FILE}`);
});
