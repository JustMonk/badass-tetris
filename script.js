const COLORS = {
   red: '#d67070',
   green: '#70d678',
   blue: '#70acd6',
   yellow: '#e5e507'
}

/*
example:
adjust('#ffffff', -20) => "#ebebeb"
adjust('000000', 20) => "#141414"
*/
function adjust(color, amount) {
   return '#' + color.replace(/^#/, '').replace(/../g, color => ('0' + Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
}

function randomInteger(min, max) {
   let rand = min + Math.random() * (max + 1 - min);
   return Math.floor(rand);
}

class Game {
   constructor(settings = { interval: 1000 }) {
      this.interval = settings.interval || 1000;
      this.intervalId = null;

      this.createNodes(600);

      const canvas = document.getElementById('canvas');
      //this.setupCanvas(canvas)
      const ctx = canvas.getContext('2d');

      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const padding = canvasHeight / 20;
      console.log('>> padding: %O', padding);
      
      const collsCount = 10;
      const rowsCount = 20;

      //Main area config
      //const mainAreaHeight = canvasHeight - (padding * 2);
      const mainAreaHeight = canvasHeight;
      const mainAreaWidth = mainAreaHeight / 2 + padding;
      const blockWidth = (mainAreaWidth-padding*2) / collsCount;
      const blockHeight = (mainAreaHeight-padding*2) / rowsCount;
      console.log('blockWidth: %o, blockHeight: %o', blockWidth, blockHeight)

      //Left area config
      const sideAreaHeight = canvasHeight;
      const sideAreaWidth = mainAreaWidth / 1.5;

      let leftAreaSize = {width: sideAreaWidth, height: sideAreaHeight};
      let mainAreaSize = {width: mainAreaWidth, height: mainAreaHeight};
      let rightAreaSize = {width: sideAreaWidth, height: sideAreaHeight}
      this.setupCanvas(canvas, leftAreaSize, mainAreaSize, rightAreaSize)

      this.canvasConfig = { 
         sideAreaWidth, sideAreaHeight,
         canvas, ctx, canvasWidth, 
         canvasHeight, padding, collsCount, 
         rowsCount, blockWidth, blockHeight,
          mainAreaHeight, mainAreaWidth }

      this.currentState = {
         //an object with key-coordinates of the form '3:5' and a value with a color code from COLORS
         field: {},
         activeFigure: null,
         score: 0
      };

      this.controls = {
         startButtonActive: false
      }

      canvas.addEventListener('mousemove', (e) => {
         //TODO: need to set new coords
         return;

         let x = e.offsetX;
         let y = e.offsetY;

         //сдвиг
         //ctx.translate(canvasHeight/2/2 + mainAreaWidth, 0);
         //координаты
         //ctx.fillRect(0, 0, mainAreaWidth/2, 30);
         let startButtonX1 = mainAreaWidth / 2 + mainAreaWidth;
         let startButtonY1 = 0;
         let startButtonX2 = startButtonX1 + mainAreaWidth;
         let startButtonY2 = startButtonY1 + 30;
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
      })
   }

   //create wrapper & canvases in DOM
   createNodes(height) {
      let wrapper = document.createElement('div');
      wrapper.id = 'game-wrapper';
      wrapper.style = `position: relative; border: 1px solid grey; width: ${50}px; height: ${height}px; font-family: 'Bebas Neue', cursive;`

      let canvas = document.createElement('canvas');
      canvas.width = '50'; //no matter
      canvas.height = height;
      canvas.id = 'canvas';
      canvas.style = 'position: absolute; z-index: 1;'
      wrapper.appendChild(canvas);

      let bgCanvas = document.createElement('canvas');
      bgCanvas.id = 'bg-canvas';
      canvas.width = '50'; //no matter
      bgCanvas.height = height;
      canvas.style = 'position: absolute; z-index: 0;'
      wrapper.appendChild(bgCanvas);

      document.body.appendChild(wrapper);
   }

   setupCanvas(canvasNode, leftArea, mainArea, rightArea) {
      let height = canvasNode.height;
      //canvasNode.width = height;
      canvasNode.width = leftArea.width + mainArea.width + rightArea.width;
      let width = canvasNode.width;

      //setup bg
      let bgCanvas = document.getElementById('bg-canvas');
      bgCanvas.width = canvasNode.width;
      let bgCtx = bgCanvas.getContext('2d');
      //bgCtx.globalAlpha = 0.5;

      bgCtx.fillStyle = '#f0f6ff' //'#bbcbe4';
      //bgCtx.fillStyle = pattern;
      bgCtx.rect(0, 0, canvasNode.width, canvasNode.height);
      bgCtx.fill();

      let color1 = '#ffffff' // '#F2EEB3'
      let color2 = 'rgba(93, 135, 211, 0.15)' //'rgba(70, 118, 205, 0.1)' //'#FF4C65';
      var numberOfStripes = width;
      //for (var i = 0; i < numberOfStripes * 2; i++) {
      for (var i = 0; i < numberOfStripes; i++) {
         //var thickness = 300 / numberOfStripes;
         var thickness = 2
         bgCtx.beginPath();
         bgCtx.strokeStyle = i % 2 ? color1 : color2;
         bgCtx.lineWidth = thickness;
         bgCtx.lineCap = 'round';

         //bgCtx.moveTo(i * thickness + thickness / 2 - 300, 0);
         bgCtx.moveTo(i * thickness + thickness  - width, 0);
         bgCtx.lineTo(0 + i * thickness + thickness , width);
         bgCtx.stroke();
      }
      
      //setup wrapper
      let wrapper = document.getElementById('game-wrapper');
      wrapper.style.width = canvasNode.width + 'px';
   }

   start() {
      console.log('start init');

      //reset state
      this.currentState = {
         field: {},
         activeFigure: null,
         score: 0
      };
      if (this.intervalId) {
         clearInterval(this.intervalId);
         this.intervalId = null;
      }

      this.currentState.activeFigure = this.createRandomFigure();

      document.addEventListener('keydown', (e) => this.moveFigure(e));

      //first render
      this.drawState();

      //controls
      this.drawControls();

      this.intervalId = setInterval(() => {
         this.getNext();
         this.drawState();
      }, this.interval);
   }

   /*-------- MAIN AREA -----------*/
   setMainArea() {
      const { ctx, sideAreaWidth, canvasHeight, padding, mainAreaWidth, mainAreaHeight } = this.canvasConfig;

      //just 4 test ; debug area border
      ctx.save()
      ctx.translate(sideAreaWidth, 0 );
      ctx.strokeRect(0,0, mainAreaWidth, mainAreaHeight)
      ctx.restore();

      let mainAreaX0 = sideAreaWidth;
      ctx.translate(mainAreaX0 + padding, 0 + padding);
   }

   drawGrid() {
      const { ctx, blockWidth, blockHeight, canvasWidth, canvasHeight, padding, rowsCount, collsCount, mainAreaHeight, mainAreaWidth } = this.canvasConfig;

      ctx.strokeStyle = 'lightgrey'
      ctx.beginPath()

      for (let i = 0; i <= collsCount; i++) {
         ctx.moveTo(blockWidth * i, 0);
         ctx.lineTo(blockWidth * i, mainAreaHeight - padding*2);
      }

      for (let i = 0; i <= rowsCount; i++) {
         ctx.moveTo(0, blockHeight * i);
         ctx.lineTo(mainAreaWidth - padding*2, blockHeight * i);
      }
      ctx.closePath();
      ctx.stroke();

   }

   drawState() {
      const { ctx, blockWidth, blockHeight, padding, canvasWidth, canvasHeight, rowsCount, collsCount, mainAreaWidth, mainAreaHeight } = this.canvasConfig;
      //установка mainArea
      ctx.save();

      this.drawScore();
      this.setMainArea();

      ctx.clearRect(0, 0, mainAreaWidth-padding*2, mainAreaHeight-padding*2);

      //render grid over field
      this.drawGrid();

      //render active figure
      this.currentState.activeFigure.coords.forEach(coord => {
         let gradient = ctx.createLinearGradient((coord.x - 1) * blockWidth + blockWidth, (coord.y - 1) * blockHeight, (coord.x - 1) * blockWidth + blockWidth, (coord.y - 1) * blockHeight + blockHeight);
         gradient.addColorStop(0, adjust(this.currentState.activeFigure.color, 50));
         gradient.addColorStop(.5, adjust(this.currentState.activeFigure.color, 10));
         gradient.addColorStop(1, adjust(this.currentState.activeFigure.color, -20));

         ctx.fillStyle = gradient;
         //ctx.fillStyle = this.currentState.activeFigure.color;
         ctx.fillRect((coord.x - 1) * blockWidth, (coord.y - 1) * blockHeight, blockWidth, blockHeight);

         ctx.save();
         //test border
         let borderSize = blockWidth / 9;
         ctx.lineWidth = borderSize
         ctx.strokeStyle = '#323232';
         ctx.strokeRect((coord.x - 1) * blockWidth + (borderSize/2), (coord.y - 1) * blockHeight+ (borderSize/2), blockWidth - borderSize, blockHeight- borderSize);

         //block light border
         //ctx.lineWidth = 3
         let borderGradient = ctx.createLinearGradient((coord.x - 1) * blockWidth, (coord.y - 1) * blockHeight, (coord.x - 1) * blockWidth + blockWidth, (coord.y - 1) * blockHeight + blockHeight);
         borderGradient.addColorStop(0, adjust(this.currentState.activeFigure.color, -50));
         borderGradient.addColorStop(.5, adjust(this.currentState.activeFigure.color, -25));
         borderGradient.addColorStop(1, adjust(this.currentState.activeFigure.color, -200));
         ctx.strokeStyle = borderGradient;
         ctx.strokeRect((coord.x - 1) * blockWidth+borderSize, (coord.y - 1) * blockHeight+borderSize, blockWidth-(borderSize*2), blockHeight-(borderSize*2));
         ctx.restore();
      });

      //render game field
      this.drawField();

      //render score in DOM
      let scoreText = document.getElementById('score');
      scoreText.textContent = this.currentState.score;

      //grid render in 1st step

      //restore coordinates binding after rendering
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
         //ctx.fillStyle = this.currentState.field[block];
         ctx.fillRect((block.split(':')[0] - 1) * blockWidth, (block.split(':')[1] - 1) * blockHeight, blockWidth, blockHeight);

         
         ctx.save();
         //test border
         let borderSize = blockWidth / 9;
         ctx.lineWidth = borderSize
         ctx.strokeStyle = '#323232';
         ctx.strokeRect((blockX - 1) * blockWidth + (borderSize/2), (blockY - 1) * blockHeight+ (borderSize/2), blockWidth-borderSize, blockHeight-borderSize);

         //block light border
         let borderGradient = ctx.createLinearGradient((blockX - 1) * blockWidth, (blockY - 1) * blockHeight, (blockX - 1) * blockWidth + blockWidth, (blockY - 1) * blockHeight + blockHeight);
         borderGradient.addColorStop(0, adjust(this.currentState.field[block], -50));
         borderGradient.addColorStop(.5, adjust(this.currentState.field[block], -25));
         borderGradient.addColorStop(1, adjust(this.currentState.field[block], -200));
         ctx.strokeStyle = borderGradient;
         ctx.strokeRect((blockX - 1) * blockWidth+borderSize, (blockY - 1) * blockHeight+borderSize, blockWidth-(borderSize*2), blockHeight-(borderSize*2));
         ctx.restore();
      });
   }

   /*------- left side ---------*/
   drawScore() {
      const { ctx, sideAreaWidth, padding, sideAreaHeight, mainAreaWidth, mainAreaHeight } = this.canvasConfig;
      ctx.save();

      ctx.strokeStyle = '#5d87d3'
      ctx.strokeRect(0,0, sideAreaWidth, sideAreaHeight)

      ctx.translate(0 + padding, 0 + padding);
      ctx.clearRect(0, 0,sideAreaWidth, sideAreaHeight - padding*2);

      //define text params
      let fontSize = sideAreaWidth / 8;
      let fontPadding = fontSize/2;

      //score border
      ctx.lineWidth = sideAreaWidth / 40;
      ctx.fillStyle = 'beige'
      ctx.fillRect(0,0,sideAreaWidth-padding*2, fontSize + fontPadding + (fontSize/4))
      ctx.strokeRect(0,0,sideAreaWidth-padding*2, fontSize + fontPadding + (fontSize/4))
      //score text
      ctx.font = `${fontSize}px Bebas Neue` //"19px serif";
      //ctx.font = "19px serif";
      ctx.textBaseline = "top";
      ctx.fillStyle = 'black'
      ctx.fillText(`Score: ${this.currentState.score}`, fontPadding, fontSize/2, sideAreaWidth);

      //lines border
      ctx.fillStyle = 'beige'
      ctx.fillRect(0, fontSize + fontPadding + (fontSize/4), sideAreaWidth-padding*2, fontSize + fontPadding + (fontSize/4))
      ctx.strokeRect(0, fontSize + fontPadding + (fontSize/4),sideAreaWidth-padding*2, fontSize + fontPadding + (fontSize/4))
      //lines text
      ctx.font = `${fontSize}px Bebas Neue` //"19px serif";
      //ctx.font = "19px serif";
      ctx.textBaseline = "top";
      ctx.fillStyle = 'black'
      ctx.fillText(`Breaks: ${0}`, fontPadding, fontSize + fontPadding + (fontSize/4) + fontSize/2, sideAreaWidth);

      ctx.restore();
      //ctx.strokeText(`Score: ${this.currentState.score}`, 10, 10);
   }

   /*------ controls (right side) -------*/
   drawControls() {
      const { ctx, sideAreaWidth, sideAreaHeight, canvasHeight, padding, mainAreaWidth, mainAreaHeight } = this.canvasConfig;
      ctx.save();

      const controlsAreaX0 = sideAreaWidth + mainAreaWidth;

      //area border for DEBUG
      ctx.strokeStyle = 'blue';
      ctx.strokeRect(controlsAreaX0,0, sideAreaWidth, sideAreaHeight);

      ctx.translate(controlsAreaX0, 0 + padding);
      //ctx.translate(canvasHeight / 2 / 2 + mainAreaWidth, 0);

      ctx.clearRect(0-5, 0, sideAreaWidth, mainAreaHeight - padding * 2);


      ctx.beginPath();
      //render start button
      //TODO: need to read buttons coords from state (set in constructor)

      if (this.controls.startButtonActive) ctx.fillStyle = '#727272';
      else ctx.fillStyle = '#dddddd';
      ctx.fillRect(0, 0, sideAreaWidth - padding, 30);

      ctx.font = "14px Bebas Neue";
      ctx.textBaseline = "hanging";
      ctx.fillStyle = '#000';
      ctx.fillText(`Start`, 10, 10);

      ctx.closePath();
      ctx.restore();
   }

   //update state, handles movements
   getNext() {
      const nextState = this.currentState;

      //collision here or extract?
      //collision handle
      let isTouched = nextState.activeFigure.coords.some(coord => {
         //contact with the bottom of cup
         if (coord.y === this.canvasConfig.rowsCount) return true;
         //contact with existing block
         if (this.checkCollision(coord.x, coord.y + 1)) return true;
      });

      if (isTouched) {
         nextState.activeFigure.coords.forEach(coord => {
            nextState.field[`${coord.x}:${coord.y}`] = nextState.activeFigure.color;
         });

         nextState.activeFigure = this.createRandomFigure();

         //endgame check
         let isStacked = nextState.activeFigure.coords.some(coord => this.checkCollision(coord.x, coord.y));
         if (isStacked) this.endGame();
      } else {
         nextState.activeFigure.coords = nextState.activeFigure.coords.map(val => ({ x: val.x, y: val.y + 1 }));
         if (nextState.activeFigure.top) nextState.activeFigure.top.y += 1;
      }

      nextState.score++;
      this.checkRowFilled();
   }

   checkRowFilled() { //or checkBreakLine
      //with recursive subcall

      //start from bottom line
      for (let i = this.canvasConfig.rowsCount; i > 1; i--) {
         if (Object.keys(this.currentState.field).filter(val => val.split(':')[1] === `${i}`).length === this.canvasConfig.collsCount) {

            //delete a filled row
            let blocks = Object.keys(this.currentState.field);
            blocks.forEach(block => {
               if (block.split(':')[1] === `${i}`) delete this.currentState.field[block]; //(!) this (':')[1] its sting type
            });
            this.currentState.score += 100;

            //copy current field
            let fieldWithOffset = Object.assign({}, this.currentState.field);

            //filter the array of occurrences where y < i
            let upstreamBlocks = Object.entries(this.currentState.field).filter(val => +val[0].split(':')[1] < i);

            //remove all higher-level blocks from the field, only remain unchanged
            upstreamBlocks.forEach(val => {
               delete fieldWithOffset[val[0]];
            });

            //add all upstream blocks back, but with a downward shift
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
      //check collision with cup borders (only X)
      if (x < 1 || x > this.canvasConfig.collsCount) return true;
      //check collision with existing blocks
      if (this.currentState.field[`${x}:${y}`]) return true;
      else return false;
   }

   moveFigure(e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;

      let limit = false;

      if (e.key === 'ArrowLeft') {
         let movedCoords = [];
         this.currentState.activeFigure.coords.forEach(coord => {
            if (this.checkCollision(coord.x - 1, coord.y)) limit = true;
            movedCoords.push({ x: limit ? coord.x : coord.x - 1, y: coord.y });
         });
         //collision check
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
         //collision check
         if (movedCoords.some(val => this.checkCollision(val.x, val.y))) limit = true;

         if (!limit) this.currentState.activeFigure.coords = movedCoords;
         if (this.currentState.activeFigure.top) this.currentState.activeFigure.top = { x: limit ? this.currentState.activeFigure.top.x : this.currentState.activeFigure.top.x + 1, y: this.currentState.activeFigure.top.y };
      }

      //speed up
      if (e.key === 'ArrowDown') {
         this.getNext();
      }

      //rotate figure
      if (e.key === 'ArrowUp') {
         let movedCoords = [];
         this.currentState.activeFigure.coords.forEach(coord => {
            if (!this.currentState.activeFigure.top) return movedCoords.push(coord);
            movedCoords.push(this.getOffset90(this.currentState.activeFigure.top.x, this.currentState.activeFigure.top.y, coord.x, coord.y));
         });

         if (movedCoords.some(val => this.checkCollision(val.x, val.y))) limit = true;
         if (!limit) this.currentState.activeFigure.coords = movedCoords;
      }

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
         tetraT: { coords: [{ x: 5, y: 1 }, { x: 4, y: 2 }, { x: 5, y: 2 }, { x: 6, y: 2 }], top: { x: 4, y: 2 } }
      }

      //pool of available figures
      const figuresList = [figures.line, figures.square, figures.tetraL, figures.tetraLInverse, figures.tetraZ, figures.tetraS, figures.tetraT];

      //not beauty but it ok
      let figure = figuresList[randomInteger(0, figuresList.length - 1)];

      let colorList = Object.values(COLORS);
      if (this.currentState.activeFigure) colorList = colorList.filter(hex => hex !== this.currentState.activeFigure.color)

      figure.color = colorList[randomInteger(0, colorList.length - 1)];

      return figure;
   }

   //yes, yes. O coors inverted, is ok :) (for fix need to invert formula)
   getOffset90(oY, oX, pointX, pointY) { //rotateFigure(coord)
      return { x: (oX + oY) - pointY, y: pointX - (oY - oX) }
   }

   endGame() {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('the end');
   }
}


let game = new Game();

//DOM events
let startButton = document.getElementById('start-button');
startButton.addEventListener('click', () => {
   game.start();
});

let logConfigButton = document.getElementById('log-config-button');
logConfigButton.addEventListener('click', () => {
   console.log(game.canvasConfig);
});

let showStateButton = document.getElementById('show-state');
showStateButton.addEventListener('click', () => {
   console.log('game.currentState: %o', game.currentState);
});