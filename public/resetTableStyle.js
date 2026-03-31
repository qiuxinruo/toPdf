const resetTableStyle = async (page, app) => {
  page.addStyleTag({
    content: `
      .ant-table-fixed { 
        width: auto!important; 
        table-layout: fixed!important; 
      }

      .ant-table-fixed col {
        width: auto!important;
        min-width: auto!important;
      }
    `,
  });
};

module.exports = resetTableStyle;
