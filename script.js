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

      const canvas = document.getElementById('canvas');
      const ctx = canvas.getContext('2d');
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const collsCount = 10;
      const rowsCount = 20;

      const blockWidth = canvasWidth / collsCount;
      const blockHeight = canvasHeight / rowsCount;

      this.canvasConfig = { canvas, ctx, canvasWidth, canvasHeight, collsCount, rowsCount, blockWidth }

      this.currentState = {
         //an object with key-coordinates of the form '3:5' and a value with a color code from COLORS
         field: {},
         activeFigure: null,
         score: 0
      };
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

      this.intervalId = setInterval(() => {
         this.getNext();
         this.drawState();
      }, this.interval);
   }

   drawGrid() {
      const { ctx, blockWidth, canvasWidth, canvasHeight, rowsCount, collsCount } = this.canvasConfig;
      ctx.strokeStyle = 'lightgrey'
      ctx.beginPath()

      for (let i = 0; i < collsCount; i++) {
         ctx.moveTo(blockWidth * i, 0);
         ctx.lineTo(blockWidth * i, canvasHeight);
      }

      for (let i = 0; i < rowsCount; i++) {
         ctx.moveTo(0, blockWidth * i);
         ctx.lineTo(canvasWidth, blockWidth * i);
      }

      ctx.stroke();
   }

   drawState() {
      const { ctx, blockWidth, canvasWidth, canvasHeight, rowsCount, collsCount } = this.canvasConfig;
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      //render active figure
      this.currentState.activeFigure.coords.forEach(coord => {
         let gradient = ctx.createRadialGradient((coord.x - 1) * blockWidth, (coord.y - 1) * blockWidth, 10, (coord.x - 1) * blockWidth + blockWidth, (coord.y - 1) * blockWidth + blockWidth, 15);
         gradient.addColorStop(0, adjust(this.currentState.activeFigure.color, 10));
         gradient.addColorStop(.5, adjust(this.currentState.activeFigure.color, 50));
         gradient.addColorStop(1, adjust(this.currentState.activeFigure.color, -10));

         ctx.fillStyle = gradient;
         ctx.fillRect((coord.x - 1) * blockWidth, (coord.y - 1) * blockWidth, blockWidth, blockWidth);
      });

      //render game field
      this.drawField();

      //render score in DOM
      let scoreText = document.getElementById('score');
      scoreText.textContent = this.currentState.score;

      //render grid over field
      this.drawGrid();
   }

   drawField() {
      const { ctx, blockWidth, canvasWidth, canvasHeight, rowsCount, collsCount } = this.canvasConfig;

      Object.keys(this.currentState.field).forEach(block => {
         let gradient = ctx.createRadialGradient((block.split(':')[0] - 1) * blockWidth, (block.split(':')[1] - 1) * blockWidth, 10, (block.split(':')[0] - 1) * blockWidth + blockWidth, (block.split(':')[1] - 1) * blockWidth + blockWidth, 15);
         gradient.addColorStop(0, adjust(this.currentState.field[block], 10));
         gradient.addColorStop(.5, adjust(this.currentState.field[block], 50));
         gradient.addColorStop(1, adjust(this.currentState.field[block], -10));

         ctx.fillStyle = gradient;
         ctx.fillRect((block.split(':')[0] - 1) * blockWidth, (block.split(':')[1] - 1) * blockWidth, blockWidth, blockWidth);
      });
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