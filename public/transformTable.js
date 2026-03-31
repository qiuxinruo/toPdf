const transformTable = async (page, app) => {
  const startTime = Date.now();

  try {
    // 选中 table 元素
    const table = await page.$(".ant-table table");

    if (!table) return;

    // 获取表格中的所有行
    const rows = await table.$$("tr");

    if (!rows || rows.length === 0) return;

    // 获取表头内容
    const headerRow = rows[0];
    const headerCells = await headerRow.$$("th");
    const headers = [];
    for (const cell of headerCells) {
      const headerText = await cell.evaluate((node) => node.innerText);
      headers.push(headerText);
    }

    // 遍历表格的行
    const tableData = [];
    const bodyRows = rows.filter((item, index) => index > 0);

    if (bodyRows.length === 0) return;
    app.log.info("表格内容为空，停止转换");

    for (const row of bodyRows) {
      const cells = await row.$$("td");
      const rowData = [];
      for (const cell of cells) {
        rowData.push(await cell.evaluate((node) => node.innerText));
      }
      tableData.push(rowData);
    }

    let allHtml = "";
    // 过滤出有数据的
    const hasDataData = tableData.filter(row => row.some(cell => (cell !== '' && cell !== null && cell !== undefined && cell.trim() !== '')));
    if (hasDataData.length === 0) return;
    app.log.info("表格数据为空，停止转换");

    hasDataData.forEach(async (data) => {
      const combinedData = {};
      headers.forEach((header, index) => {
        combinedData[header] = data[index] && data[index] !== '暂无相关数据' ? data[index] : '';
      });

      const row = Object.entries(combinedData)
        .map(([key, value]) => `<p>${key}: ${value}</p>`)
        .join("");

      allHtml += row;

      allHtml += `<p style="margin: 0 0 40px 0;"></p>`;
    });

    // 插入后删除table元素
    await page.evaluate(
      (table, allHtml) => {
        table.insertAdjacentHTML("afterend", allHtml);
        table.remove();
      },
      table,
      allHtml
    );
  } catch (err) {
    app.log.info("转换表格内容错误", err);
  }

  const executionTime = Date.now() - startTime;
  app.log.info(`处理表格数据共消耗：${executionTime} 毫秒`);
};

module.exports = transformTable;
