const resetPageStyle = async (page, app) => {
  page.addStyleTag({
    content: `
      .pdf-grid .mega-layout-container-content.grid{
        grid-template-columns: repeat(6, minmax(50px, 1fr)) !important;
      }
    `,
  });
};

module.exports = resetPageStyle;
