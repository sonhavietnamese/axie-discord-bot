export const gameHtmlTemplate = `
<html>
<style> 
  @font-face {
    font-family: 'Rowdies';
    src: url('{{{font}}}') format('truetype');
  }
  body {
    width: 1920px;
    height: 1350px;
    background-color: #ffffff;
    font-family: 'Rowdies';
  }

  .background-container {
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
    z-index: 1;
  }

  .axie-container {
    width: 875px;
    height: 875px;
    display: flex;
    justify-content: center;
    align-items: center;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -35%);
    z-index: 2;
  }

  .axie-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .axie-mask {
    width: 875px;
    height: 875px;
    background-color: #603E1C;
    position: absolute;
    top: 273px;
    left: 523px;
    -webkit-mask: url('{{{mask}}}') no-repeat center;
    mask: url('{{{mask}}}') no-repeat center;
    -webkit-mask-size: contain;
    mask-size: contain;
  }
</style> 
<body>
  <div class="background-container"> 
    <img src="{{{background}}}" class="background-image" />
  </div>
  <div class="axie-container"> 
    <div class="axie-mask"></div>
  </div>
</body>
</html>`

export const revealHtmlTemplate = `
<html>
<style>
  @font-face {
    font-family: 'Rowdies';
    src: url('{{{font}}}') format('truetype');
  }
  body {
    width: 1920px;
    height: 1350px;
    background-color: #ffffff;
    font-family: 'Rowdies';
    position: relative;
  }

  .background-container {
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
    z-index: 1;
  }

  .axie-container {
    width: 875px;
    height: 875px;
    position: absolute;
    top: 40%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 2;
  }

  .axie-image {
    width: 875px;
    height: 875px;
    object-fit: contain;
    position: absolute;
    top: 0;
    left: 0;
  }

  .text-container {
    position: absolute;
    top: 90%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    z-index: 3;
    color: #ffffff;
    font-size: 40px;
  }
</style>
<body>
  <div class="background-container">
    <img src="{{{background}}}" class="background-image" />
  </div>
  <div class="axie-container">
    <img src="{{{axie}}}" class="axie-image" />
  </div>
  <div class="text-container">
    <h1 class="text">{{axieName}}</h1>
  </div>
</body>
</html>`
