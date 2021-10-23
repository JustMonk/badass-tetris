const COLORS = {
   red: '#d67070',
   green: '#70d678',
   blue: '#70acd6',
   yellow: '#e5e507'
}

function adjust(color, amount) {
   return '#' + color.replace(/^#/, '').replace(/../g, color => ('0' + Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
}

function randomInteger(min, max) {
   let rand = min + Math.random() * (max + 1 - min);
   return Math.floor(rand);
}

class TetrisGame {
   constructor(settings = {}) {
      this.interval = settings.interval || 700;
      this.intervalId = null;

      this.createNodes(settings.height, settings.container);

      const canvas = document.getElementById('game-canvas');
      const ctx = canvas.getContext('2d');

      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const padding = canvasHeight / 20;

      const collsCount = 10;
      const rowsCount = 20;

      const mainAreaHeight = canvasHeight;
      const mainAreaWidth = mainAreaHeight / 2 + padding;
      const blockWidth = (mainAreaWidth - padding * 2) / collsCount;
      const blockHeight = (mainAreaHeight - padding * 2) / rowsCount;

      const sideAreaHeight = canvasHeight;
      const sideAreaWidth = mainAreaWidth / 1.5;
      const fontSize = sideAreaWidth / 8;
      const fontPadding = fontSize / 2;
      const scoreBlockHeight = fontSize + fontPadding + (fontSize / 4);
      const borderSize = sideAreaWidth / 40;

      const borderColor = '#5272ad';
      const borderColorLight = '#869cc5';
      const controlBackground = '#d7deeb';

      let leftAreaSize = { width: sideAreaWidth, height: sideAreaHeight };
      let mainAreaSize = { width: mainAreaWidth, height: mainAreaHeight };
      let rightAreaSize = { width: sideAreaWidth, height: sideAreaHeight }
      this.setupCanvas(canvas, leftAreaSize, mainAreaSize, rightAreaSize)

      this.canvasConfig = {
         borderColorLight, borderColor, controlBackground,
         borderSize, fontSize, fontPadding,
         scoreBlockHeight,
         sideAreaWidth, sideAreaHeight,
         canvas, ctx, canvasWidth,
         canvasHeight, padding, collsCount,
         rowsCount, blockWidth, blockHeight,
         mainAreaHeight, mainAreaWidth
      }

      this.currentState = {
         field: {},
         activeFigure: null,
         nextFigure: null,
         score: 0,
         breaks: 0,
         gameOver: false
      };

      this.controls = {
         startButtonActive: false,
         quitButtonActive: false
      }

      canvas.addEventListener('mousemove', (e) => {
         let x = e.offsetX;
         let y = e.offsetY;

         this.checkStartButtonHover(x, y);
         this.checkQuitButtonHover(x, y);
      });

      canvas.addEventListener('click', (e) => {
         e.preventDefault();
         e.stopPropagation();
         e.cancelBubble = true;
         if (this.controls.startButtonActive) this.startButtonClick();
         else if (this.controls.quitButtonActive) this.quitButtonClick();
         return false;
      });

      document.fonts.ready.then(() => {
         this.drawScore();
         this.drawState();
         this.drawControls();
      });

      this.moveFigure = this.moveFigure.bind(this);
   }

   resetState() {
      this.currentState = {
         field: {},
         activeFigure: null,
         nextFigure: null,
         score: 0,
         breaks: 0,
         gameOver: false
      };
   }

   checkStartButtonHover(x, y) {
      const { sideAreaWidth, mainAreaWidth, padding, scoreBlockHeight, canvas } = this.canvasConfig;

      let startButtonX1 = sideAreaWidth + mainAreaWidth;
      let startButtonY1 = padding;
      let startButtonX2 = startButtonX1 + (sideAreaWidth - padding);
      let startButtonY2 = startButtonY1 + scoreBlockHeight;

      if ((x >= startButtonX1 && x <= startButtonX2) && (y >= startButtonY1 && y <= startButtonY2)) {
         this.controls.startButtonActive = true;
         canvas.style.cursor = 'pointer';
         this.drawControls();
      }
      else if (this.controls.startButtonActive) {
         this.controls.startButtonActive = false;
         canvas.style.cursor = 'default';
         this.drawControls();
      }
   }

   checkQuitButtonHover(x, y) {
      const { sideAreaWidth, mainAreaWidth, padding, scoreBlockHeight, canvas } = this.canvasConfig;

      let quitButtonX1 = sideAreaWidth + mainAreaWidth;
      let quitButtonY1 = scoreBlockHeight + padding / 2 + padding;
      let quitButtonX2 = quitButtonX1 + (sideAreaWidth - padding);
      let quitButtonY2 = quitButtonY1 + scoreBlockHeight;

      if ((x >= quitButtonX1 && x <= quitButtonX2) && (y >= quitButtonY1 && y <= quitButtonY2)) {
         this.controls.quitButtonActive = true;
         canvas.style.cursor = 'pointer';
         this.drawControls();
      }
      else if (this.controls.quitButtonActive) {
         this.controls.quitButtonActive = false;
         canvas.style.cursor = 'default';
         this.drawControls();
      }
   }

   startButtonClick() {
      if (!this.intervalId && !this.currentState.activeFigure) this.start();
      else if (this.intervalId) {
         //pause
         clearInterval(this.intervalId);
         this.intervalId = null;
      } else if (!this.intervalId && !this.currentState.gameOver) {
         //resume
         this.runGameLoop();
      } else {
         //restart
         this.start();
      }

      this.drawControls();
   }

   quitButtonClick() {
      this.resetState();

      if (this.intervalId) {
         clearInterval(this.intervalId);
         this.intervalId = null;
      }
      document.removeEventListener('keydown', this.moveFigure);

      this.drawScore();
      this.drawState();
      this.drawControls();
   }

   createNodes(height = 600, container = document.body) {
      let wrapper = document.createElement('div');
      wrapper.id = 'game-wrapper';
      wrapper.style = `position: relative; border: 1px solid rgb(128 128 128 / 32%); width: ${50}px; height: ${height}px; font-family: 'Bebas Neue', cursive; user-select: none; margin: 0 auto;`

      let canvas = document.createElement('canvas');
      canvas.width = '50';
      canvas.height = height;
      canvas.id = 'game-canvas';
      canvas.style = 'position: absolute; z-index: 1;'
      wrapper.appendChild(canvas);

      let bgCanvas = document.createElement('canvas');
      bgCanvas.id = 'bg-canvas';
      canvas.width = '50';
      bgCanvas.height = height;
      canvas.style = 'position: absolute; z-index: 0;'
      wrapper.appendChild(bgCanvas);

      container.appendChild(wrapper);
   }

   setupCanvas(canvasNode, leftArea, mainArea, rightArea) {
      canvasNode.width = leftArea.width + mainArea.width + rightArea.width;
      let width = canvasNode.width;

      let bgCanvas = document.getElementById('bg-canvas');
      bgCanvas.width = canvasNode.width;
      let bgCtx = bgCanvas.getContext('2d');

      bgCtx.fillStyle = '#f0f6ff'

      bgCtx.rect(0, 0, canvasNode.width, canvasNode.height);
      bgCtx.fill();

      let color1 = '#ffffff'
      let color2 = 'rgba(93, 135, 211, 0.15)'
      var numberOfStripes = width;

      for (var i = 0; i < numberOfStripes; i++) {
         var thickness = 2
         bgCtx.beginPath();
         bgCtx.strokeStyle = i % 2 ? color1 : color2;
         bgCtx.lineWidth = thickness;
         bgCtx.lineCap = 'round';

         bgCtx.moveTo(i * thickness + thickness - width, 0);
         bgCtx.lineTo(0 + i * thickness + thickness, width);
         bgCtx.stroke();
      }

      let wrapper = document.getElementById('game-wrapper');
      wrapper.style.width = canvasNode.width + 'px';
   }

   runGameLoop() {
      this.intervalId = setInterval(() => {
         this.getNext();
         this.drawState();
      }, this.interval);
   }

   start() {
      this.resetState();

      if (this.intervalId) {
         clearInterval(this.intervalId);
         this.intervalId = null;
      }

      this.currentState.activeFigure = this.createRandomFigure();
      this.currentState.nextFigure = this.createRandomFigure();

      document.addEventListener('keydown', this.moveFigure);

      this.drawState();
      this.drawControls();

      this.runGameLoop();
   }

   setMainArea() {
      const { ctx, sideAreaWidth, padding } = this.canvasConfig;
      let mainAreaX0 = sideAreaWidth;
      ctx.translate(mainAreaX0 + padding, 0 + padding);
   }

   drawGrid() {
      const { ctx, blockWidth, blockHeight, borderSize, canvasWidth, canvasHeight, padding, rowsCount, collsCount, mainAreaHeight, mainAreaWidth } = this.canvasConfig;

      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(0, 0, mainAreaWidth - padding * 2, mainAreaHeight - padding * 2)

      ctx.lineWidth = borderSize;
      ctx.strokeStyle = "#5272ad"
      ctx.strokeRect(0 - borderSize / 2, 0 - borderSize / 2, mainAreaWidth - padding * 2 + borderSize, mainAreaHeight - padding * 2 + borderSize)
      ctx.restore();

      ctx.strokeStyle = 'lightgrey'
      ctx.beginPath()

      for (let i = 0; i <= collsCount; i++) {
         ctx.moveTo(blockWidth * i, 0);
         ctx.lineTo(blockWidth * i, mainAreaHeight - padding * 2);
      }

      for (let i = 0; i <= rowsCount; i++) {
         ctx.moveTo(0, blockHeight * i);
         ctx.lineTo(mainAreaWidth - padding * 2, blockHeight * i);
      }
      ctx.closePath();
      ctx.stroke();
   }

   drawState() {
      const { ctx, blockWidth, blockHeight, borderSize, padding, canvasWidth, canvasHeight, rowsCount, collsCount, mainAreaWidth, mainAreaHeight } = this.canvasConfig;

      ctx.save();

      this.drawScore();
      this.drawControls();

      this.setMainArea();
      ctx.clearRect(0 - padding, 0 - padding, mainAreaWidth, mainAreaHeight);
      this.drawGrid();

      if (!this.currentState.activeFigure) return ctx.restore();

      this.currentState.activeFigure.coords.forEach(coord => {
         let gradient = ctx.createLinearGradient((coord.x - 1) * blockWidth + blockWidth, (coord.y - 1) * blockHeight, (coord.x - 1) * blockWidth + blockWidth, (coord.y - 1) * blockHeight + blockHeight);
         gradient.addColorStop(0, adjust(this.currentState.activeFigure.color, 50));
         gradient.addColorStop(.5, adjust(this.currentState.activeFigure.color, 10));
         gradient.addColorStop(1, adjust(this.currentState.activeFigure.color, -20));

         ctx.fillStyle = gradient;

         ctx.fillRect((coord.x - 1) * blockWidth, (coord.y - 1) * blockHeight, blockWidth, blockHeight);

         ctx.save();

         let borderSize = blockWidth / 9;
         ctx.lineWidth = borderSize
         ctx.strokeStyle = '#323232';
         ctx.strokeRect((coord.x - 1) * blockWidth + (borderSize / 2), (coord.y - 1) * blockHeight + (borderSize / 2), blockWidth - borderSize, blockHeight - borderSize);

         let borderGradient = ctx.createLinearGradient((coord.x - 1) * blockWidth, (coord.y - 1) * blockHeight, (coord.x - 1) * blockWidth + blockWidth, (coord.y - 1) * blockHeight + blockHeight);
         borderGradient.addColorStop(0, adjust(this.currentState.activeFigure.color, -50));
         borderGradient.addColorStop(.5, adjust(this.currentState.activeFigure.color, -25));
         borderGradient.addColorStop(1, adjust(this.currentState.activeFigure.color, -200));
         ctx.strokeStyle = borderGradient;
         ctx.strokeRect((coord.x - 1) * blockWidth + borderSize, (coord.y - 1) * blockHeight + borderSize, blockWidth - (borderSize * 2), blockHeight - (borderSize * 2));
         ctx.restore();
      });

      this.drawField();

      ctx.restore();
   }

   drawField() {
      const { ctx, blockWidth, blockHeight, canvasWidth, canvasHeight, rowsCount, collsCount } = this.canvasConfig;

      Object.keys(this.currentState.field).forEach(block => {
         let blockX = block.split(':')[0];
         let blockY = block.split(':')[1];

         let gradient = ctx.createLinearGradient((block.split(':')[0] - 1) * blockWidth + blockWidth, (block.split(':')[1] - 1) * blockHeight, (block.split(':')[0] - 1) * blockWidth + blockWidth, (block.split(':')[1] - 1) * blockHeight + blockHeight);
         gradient.addColorStop(0, adjust(this.currentState.field[block], 50));
         gradient.addColorStop(.5, adjust(this.currentState.field[block], 10));
         gradient.addColorStop(1, adjust(this.currentState.field[block], -20));

         ctx.fillStyle = gradient;

         ctx.fillRect((block.split(':')[0] - 1) * blockWidth, (block.split(':')[1] - 1) * blockHeight, blockWidth, blockHeight);

         ctx.save();

         let borderSize = blockWidth / 9;
         ctx.lineWidth = borderSize
         ctx.strokeStyle = '#323232';
         ctx.strokeRect((blockX - 1) * blockWidth + (borderSize / 2), (blockY - 1) * blockHeight + (borderSize / 2), blockWidth - borderSize, blockHeight - borderSize);

         let borderGradient = ctx.createLinearGradient((blockX - 1) * blockWidth, (blockY - 1) * blockHeight, (blockX - 1) * blockWidth + blockWidth, (blockY - 1) * blockHeight + blockHeight);
         borderGradient.addColorStop(0, adjust(this.currentState.field[block], -50));
         borderGradient.addColorStop(.5, adjust(this.currentState.field[block], -25));
         borderGradient.addColorStop(1, adjust(this.currentState.field[block], -200));
         ctx.strokeStyle = borderGradient;
         ctx.strokeRect((blockX - 1) * blockWidth + borderSize, (blockY - 1) * blockHeight + borderSize, blockWidth - (borderSize * 2), blockHeight - (borderSize * 2));
         ctx.restore();
      });
   }

   drawScore() {
      const { ctx, controlBackground, scoreBlockHeight, fontSize, fontPadding, sideAreaWidth, padding, borderSize, sideAreaHeight, mainAreaWidth, mainAreaHeight, blockWidth, blockHeight } = this.canvasConfig;
      ctx.save();

      ctx.strokeStyle = '#5272ad'

      ctx.translate(0 + padding, 0 + padding);
      ctx.clearRect(0 - borderSize, 0 - borderSize, sideAreaWidth, sideAreaHeight - padding * 2);

      ctx.lineWidth = borderSize;
      ctx.fillStyle = controlBackground;

      ctx.fillRect(0, 0, sideAreaWidth - padding - borderSize, fontSize + fontPadding + (fontSize / 4))
      ctx.strokeRect(0, 0, sideAreaWidth - padding - borderSize, fontSize + fontPadding + (fontSize / 4))

      ctx.font = `${fontSize}px Bebas Neue`
      ctx.textBaseline = "top";
      ctx.fillStyle = '#425b8b'
      ctx.fillText(`Score: ${this.currentState.score}`, fontPadding, fontSize / 2, sideAreaWidth);

      ctx.fillStyle = '#d7deeb'
      ctx.fillRect(0, fontSize + fontPadding + (fontSize / 4), sideAreaWidth - padding - borderSize, fontSize + fontPadding + (fontSize / 4))
      ctx.strokeRect(0, fontSize + fontPadding + (fontSize / 4), sideAreaWidth - padding - borderSize, fontSize + fontPadding + (fontSize / 4))

      ctx.font = `${fontSize}px Bebas Neue`
      ctx.textBaseline = "top";
      ctx.fillStyle = '#425b8b'
      ctx.fillText(`Breaks: ${this.currentState.breaks}`, fontPadding, fontSize + fontPadding + (fontSize / 4) + fontSize / 2, sideAreaWidth);

      ctx.fillStyle = 'rgba(215, 222, 235, 0.36)';
      ctx.fillRect(0, scoreBlockHeight * 3, sideAreaWidth - padding - borderSize, scoreBlockHeight * 3);
      ctx.strokeStyle = '#869cc5'
      ctx.strokeRect(0, scoreBlockHeight * 3, sideAreaWidth - padding - borderSize, scoreBlockHeight * 3)

      if (!this.currentState.nextFigure) return ctx.restore();

      let poinsSortedByX = this.currentState.nextFigure.coords.map(val => val.x).sort();
      let poinsSortedByY = this.currentState.nextFigure.coords.map(val => val.y).sort();
      let figureMiddleX = (poinsSortedByX[poinsSortedByX.length - 1] - poinsSortedByX[0] + 1) * blockWidth / 2;
      let figureMiddleY = (poinsSortedByY[poinsSortedByX.length - 1] - poinsSortedByY[0] + 1) * blockHeight / 2;

      let areaMiddleX = (sideAreaWidth - padding - borderSize) / 2;
      let areaMiddleY = (scoreBlockHeight * 3) / 2;

      ctx.translate(areaMiddleX - figureMiddleX, scoreBlockHeight * 3 + areaMiddleY - figureMiddleY);

      this.currentState.nextFigure.coords.forEach(coord => {
         let gradient = ctx.createLinearGradient((coord.x - 1) * blockWidth + blockWidth, (coord.y - 1) * blockHeight, (coord.x - 1) * blockWidth + blockWidth, (coord.y - 1) * blockHeight + blockHeight);
         gradient.addColorStop(0, adjust(this.currentState.nextFigure.color, 50));
         gradient.addColorStop(.5, adjust(this.currentState.nextFigure.color, 10));
         gradient.addColorStop(1, adjust(this.currentState.nextFigure.color, -20));

         ctx.fillStyle = gradient;
         ctx.fillRect((coord.x - poinsSortedByX[0]) * blockWidth, (coord.y - 1) * blockHeight, blockWidth, blockHeight);

         let borderSize = blockWidth / 9;
         ctx.lineWidth = borderSize
         ctx.strokeStyle = '#323232';
         ctx.strokeRect((coord.x - poinsSortedByX[0]) * blockWidth + (borderSize / 2), (coord.y - 1) * blockHeight + (borderSize / 2), blockWidth - borderSize, blockHeight - borderSize);

         let borderGradient = ctx.createLinearGradient((coord.x - poinsSortedByX[0]) * blockWidth, (coord.y - 1) * blockHeight, (coord.x - poinsSortedByX[0]) * blockWidth + blockWidth, (coord.y - 1) * blockHeight + blockHeight);
         borderGradient.addColorStop(0, adjust(this.currentState.nextFigure.color, -50));
         borderGradient.addColorStop(.5, adjust(this.currentState.nextFigure.color, -25));
         borderGradient.addColorStop(1, adjust(this.currentState.nextFigure.color, -200));
         ctx.strokeStyle = borderGradient;
         ctx.strokeRect((coord.x - poinsSortedByX[0]) * blockWidth + borderSize, (coord.y - 1) * blockHeight + borderSize, blockWidth - (borderSize * 2), blockHeight - (borderSize * 2));
      });

      ctx.restore();
   }

   drawControls() {
      const { ctx, borderColorLight, borderColor, sideAreaWidth, scoreBlockHeight, borderSize, fontSize, fontPadding, sideAreaHeight, padding, mainAreaWidth, mainAreaHeight } = this.canvasConfig;
      ctx.save();

      const controlsAreaX0 = sideAreaWidth + mainAreaWidth;
      ctx.translate(controlsAreaX0 + borderSize, 0 + padding);
      ctx.clearRect(0 - borderSize, 0 - borderSize, sideAreaWidth, mainAreaHeight - padding * 2 + borderSize * 2);

      if (this.controls.startButtonActive) ctx.fillStyle = adjust('#d7deeb', -50);
      else ctx.fillStyle = '#d7deeb';

      //start button border
      ctx.lineWidth = borderSize;
      ctx.strokeStyle = borderColor;
      ctx.fillRect(0, 0, sideAreaWidth - padding, scoreBlockHeight)
      ctx.strokeRect(0, 0, sideAreaWidth - padding, scoreBlockHeight)
      ctx.font = `${fontSize}px Bebas Neue`
      ctx.textBaseline = "top";
      ctx.textAlign = "center";
      ctx.fillStyle = '#000';
      let buttonText = this.intervalId ? 'Pause' : 'Start';
      if (!this.intervalId && this.currentState.activeFigure) buttonText = 'Resume';
      if (this.currentState.gameOver) buttonText = 'Restart';
      ctx.fillText(buttonText, (sideAreaWidth / 2 + fontPadding) - padding, fontPadding, sideAreaWidth);

      //quit button
      if (this.controls.quitButtonActive) ctx.fillStyle = adjust('#d7deeb', -50);
      else ctx.fillStyle = '#d7deeb';
      ctx.strokeStyle = borderColor
      ctx.fillRect(0, scoreBlockHeight + padding / 2, sideAreaWidth - padding, scoreBlockHeight)
      ctx.strokeRect(0, scoreBlockHeight + padding / 2, sideAreaWidth - padding, scoreBlockHeight)
      ctx.font = `${fontSize}px Bebas Neue`
      ctx.textBaseline = "top";
      ctx.textAlign = "center";
      ctx.fillStyle = '#000';
      ctx.fillText(`Exit`, (sideAreaWidth / 2 + fontPadding) - padding, fontPadding + scoreBlockHeight + padding / 2, sideAreaWidth);

      //contols help block
      ctx.strokeStyle = borderColorLight;
      ctx.fillStyle = 'rgba(215, 222, 235, 0.36)';
      ctx.fillRect(0, (sideAreaHeight - padding * 2 + borderSize) - scoreBlockHeight * 3, sideAreaWidth - padding, scoreBlockHeight * 3 - fontPadding / 1.5);
      ctx.strokeRect(0, (sideAreaHeight - padding * 2 + borderSize) - scoreBlockHeight * 3, sideAreaWidth - padding, scoreBlockHeight * 3 - fontPadding / 1.5)
      ctx.fillStyle = '#979797';
      ctx.textAlign = "center";
      ctx.fillText(`🠕 rotate`, (sideAreaWidth / 2 + fontPadding) - padding, (fontPadding + (sideAreaHeight - padding * 2 + borderSize) - scoreBlockHeight * 3), sideAreaWidth);
      ctx.fillText(`🠔 move left`, (sideAreaWidth / 2 + fontPadding) - padding, (fontPadding + (sideAreaHeight - padding * 2 + borderSize) - scoreBlockHeight * 3) + fontSize, sideAreaWidth);
      ctx.fillText(`🠖 move right`, (sideAreaWidth / 2 + fontPadding) - padding, (fontPadding + (sideAreaHeight - padding * 2 + borderSize) - scoreBlockHeight * 3) + fontSize * 2, sideAreaWidth);
      ctx.fillText(`🠗 speed-up`, (sideAreaWidth / 2 + fontPadding) - padding, (fontPadding + (sideAreaHeight - padding * 2 + borderSize) - scoreBlockHeight * 3) + fontSize * 3, sideAreaWidth);

      ctx.restore();
   }

   getNext() {
      const nextState = this.currentState;

      let isTouched = nextState.activeFigure.coords.some(coord => this.checkCollision(coord.x, coord.y + 1));

      if (!isTouched) {
         nextState.activeFigure.coords = nextState.activeFigure.coords.map(val => ({ x: val.x, y: val.y + 1 }));
         if (nextState.activeFigure.top) nextState.activeFigure.top.y += 1;
      }

      if (isTouched) {
         nextState.activeFigure.coords.forEach(coord => {
            nextState.field[`${coord.x}:${coord.y}`] = nextState.activeFigure.color;
         });

         this.checkRowFilled();

         nextState.activeFigure = nextState.nextFigure;
         nextState.nextFigure = this.createRandomFigure();

         let isStacked = nextState.activeFigure.coords.some(coord => this.checkCollision(coord.x, coord.y));
         if (isStacked) this.endGame();
      }

      nextState.score++;
   }

   checkRowFilled() {
      for (let i = this.canvasConfig.rowsCount; i > 1; i--) {

         if (Object.keys(this.currentState.field).filter(val => val.split(':')[1] === `${i}`).length === this.canvasConfig.collsCount) {

            let blocks = Object.keys(this.currentState.field);
            blocks.forEach(block => {
               if (block.split(':')[1] === `${i}`) delete this.currentState.field[block]; //(!) this (':')[1] its sting type
            });

            this.currentState.score += 100;
            this.currentState.breaks += 1;

            let fieldWithOffset = Object.assign({}, this.currentState.field);
            let upstreamBlocks = Object.entries(this.currentState.field).filter(val => +val[0].split(':')[1] < i);
            upstreamBlocks.forEach(val => {
               delete fieldWithOffset[val[0]];
            });

            upstreamBlocks.forEach(val => {
               let x = val[0].split(':')[0];
               let y = val[0].split(':')[1];
               fieldWithOffset[`${x}:${+y + 1}`] = val[1];
            })

            this.currentState.field = fieldWithOffset;

            this.checkRowFilled();
            break;
         }
      }
   }

   checkCollision(x, y) {
      if (x < 1 || x > this.canvasConfig.collsCount) return true;
      if (y < 1 || y > this.canvasConfig.rowsCount) return true;

      //check collision with existing blocks
      if (this.currentState.field[`${x}:${y}`]) return true;
      else return false;
   }

   moveFigure(e) {
      if (!this.intervalId) return;
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;

      let limit = false;

      if (e.key === 'ArrowLeft') {
         let movedCoords = [];
         this.currentState.activeFigure.coords.forEach(coord => {
            if (this.checkCollision(coord.x - 1, coord.y)) limit = true;
            movedCoords.push({ x: limit ? coord.x : coord.x - 1, y: coord.y });
         });
         if (movedCoords.some(val => this.checkCollision(val.x, val.y))) limit = true;

         if (!limit) this.currentState.activeFigure.coords = movedCoords;
         if (this.currentState.activeFigure.top) this.currentState.activeFigure.top = { x: limit ? this.currentState.activeFigure.top.x : this.currentState.activeFigure.top.x - 1, y: this.currentState.activeFigure.top.y };
      }

      if (e.key === 'ArrowRight') {
         let movedCoords = [];
         this.currentState.activeFigure.coords.forEach(coord => {
            if (this.checkCollision(coord.x + 1, coord.y)) limit = true;
            movedCoords.push({ x: limit ? coord.x : coord.x + 1, y: coord.y });
         });
         if (movedCoords.some(val => this.checkCollision(val.x, val.y))) limit = true;

         if (!limit) this.currentState.activeFigure.coords = movedCoords;
         if (this.currentState.activeFigure.top) this.currentState.activeFigure.top = { x: limit ? this.currentState.activeFigure.top.x : this.currentState.activeFigure.top.x + 1, y: this.currentState.activeFigure.top.y };
      }

      if (e.key === 'ArrowDown') {
         this.getNext();
      }

      if (e.key === 'ArrowUp') {
         let movedCoords = [];
         this.currentState.activeFigure.coords.forEach(coord => {
            if (!this.currentState.activeFigure.top) return movedCoords.push(coord);
            movedCoords.push(this.getOffset90(this.currentState.activeFigure.top.x, this.currentState.activeFigure.top.y, coord.x, coord.y));
         });

         if (movedCoords.some(val => this.checkCollision(val.x, val.y))) limit = true;
         if (!limit) this.currentState.activeFigure.coords = movedCoords;
      }

      e.preventDefault();
      this.drawState();
   }

   createRandomFigure() {
      const figures = {
         line: { coords: [{ x: 4, y: 1 }, { x: 5, y: 1 }, { x: 6, y: 1 }, { x: 7, y: 1 }], top: { x: 5, y: 1 } },
         square: { coords: [{ x: 5, y: 1 }, { x: 5, y: 2 }, { x: 6, y: 1 }, { x: 6, y: 2 }], top: false },
         tetraL: { coords: [{ x: 4, y: 1 }, { x: 4, y: 2 }, { x: 5, y: 2 }, { x: 6, y: 2 }], top: { x: 5, y: 2 } },
         tetraLInverse: { coords: [{ x: 6, y: 1 }, { x: 4, y: 2 }, { x: 5, y: 2 }, { x: 6, y: 2 }], top: { x: 5, y: 2 } },
         tetraZ: { coords: [{ x: 4, y: 1 }, { x: 5, y: 1 }, { x: 5, y: 2 }, { x: 6, y: 2 }], top: { x: 5, y: 2 } },
         tetraS: { coords: [{ x: 6, y: 1 }, { x: 5, y: 1 }, { x: 5, y: 2 }, { x: 4, y: 2 }], top: { x: 5, y: 2 } },
         tetraT: { coords: [{ x: 5, y: 1 }, { x: 4, y: 2 }, { x: 5, y: 2 }, { x: 6, y: 2 }], top: { x: 5, y: 2 } }
      }

      const figuresList = Object.values(figures);
      let figure = figuresList[randomInteger(0, figuresList.length - 1)];

      let colorList = Object.values(COLORS);
      if (this.currentState.activeFigure) colorList = colorList.filter(hex => hex !== this.currentState.activeFigure.color)

      figure.color = colorList[randomInteger(0, colorList.length - 1)];

      return figure;
   }

   //O-coors inverted, is ok :)
   getOffset90(oY, oX, pointX, pointY) {
      return { x: (oX + oY) - pointY, y: pointX - (oY - oX) }
   }

   endGame() {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.currentState.gameOver = true;
   }

   destroy() {
      this.endGame();
      this.resetState();
      let gameWrapper = document.getElementById('game-wrapper');
      if (gameWrapper) gameWrapper.remove();
   }
}

/*
interface GameOptions {
   height?: number
   container?: DOMElement
   interval?: number
}
*/
let game = new TetrisGame();

document.getElementById('resolution-slider').addEventListener('change', (e) => {
   game.destroy();
   game = new TetrisGame({ height: e.target.value });
   let gameCanvas = document.getElementById('game-canvas');
   let currentValue = `${gameCanvas.width}x${gameCanvas.height}`;
   document.getElementById('resolution-value').textContent = currentValue;
})