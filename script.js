const COLORS = {
   red: '#d67070',
   green: '#70d678',
   blue: '#70acd6',
   yellow: '#e9e20b'
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
      const blockWidth = canvasHeight / rowsCount;

      this.canvasConfig = { canvas, ctx, canvasWidth, canvasHeight, collsCount, rowsCount, blockWidth }

      this.currentState = {
         field: {},
         activeFigure: null,
         score: 0
      };
   }

   start() {
      console.log('start init');
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

      //render all moves
      ctx.stroke();
   }

   drawState() {
      const { ctx, blockWidth, canvasWidth, canvasHeight, rowsCount, collsCount } = this.canvasConfig;

      //clear
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      ctx.fillStyle = this.currentState.activeFigure.color;
      this.currentState.activeFigure.coords.forEach(coord => {
         ctx.fillRect((coord.x - 1) * blockWidth, (coord.y - 1) * blockWidth, blockWidth, blockWidth);
      });

      this.drawField();

      let scoreText = document.getElementById('score');
      scoreText.textContent = this.currentState.score;

      this.drawGrid();
   }

   drawField() {
      const { ctx, blockWidth, canvasWidth, canvasHeight, rowsCount, collsCount } = this.canvasConfig;

      Object.keys(this.currentState.field).forEach(block => {
         ctx.fillStyle = this.currentState.field[block];
         ctx.fillRect((block.split(':')[0] - 1) * blockWidth, (block.split(':')[1] - 1) * blockWidth, blockWidth, blockWidth);
      });
   }


   getNext() {
      const nextState = this.currentState;

      let isTouched = nextState.activeFigure.coords.some(coord => {
         if (coord.y === this.canvasConfig.rowsCount) return true;
         if (this.checkCollision(coord.x, coord.y + 1)) return true;
      });

      if (isTouched) {
         nextState.activeFigure.coords.forEach(coord => {
            nextState.field[`${coord.x}:${coord.y}`] = nextState.activeFigure.color;
         });

         nextState.activeFigure = this.createRandomFigure();

         let isStacked = nextState.activeFigure.coords.some(coord => this.checkCollision(coord.x, coord.y));
         if (isStacked) {/**/}
      } else {
         nextState.activeFigure.coords = nextState.activeFigure.coords.map(val => ({ x: val.x, y: val.y + 1 }));
         if (nextState.activeFigure.top) nextState.activeFigure.top.y += 1;
      }

      nextState.score++;
      this.checkRowFilled();
   }

   checkRowFilled() {
      for (let i = this.canvasConfig.rowsCount; i > 1; i--) {
         if (Object.keys(this.currentState.field).filter(val => val.split(':')[1] === `${i}`).length === this.canvasConfig.collsCount) {
            let blocks = Object.keys(this.currentState.field);
            blocks.forEach(block => {
               if (block.split(':')[1] === `${i}`) delete this.currentState.field[block]; //(!) тут (':')[1] это строка
            });
            this.currentState.score += 100;

            let fieldWithOffset = {};

            let upstreamBlocks = Object.keys(this.currentState.field).filter(val => +val.split(':')[1] < i);
            upstreamBlocks.forEach(val => {
               let pointWithOffset = `${val.split(':')[0]}:${+val.split(':')[1] + 1}`;
               fieldWithOffset[pointWithOffset] = this.currentState.field[val];
            });
            this.currentState.field = fieldWithOffset;

            this.checkRowFilled();
            break;
         }
      }
   }

   checkCollision(x, y) {
      if (this.currentState.field[`${x}:${y}`]) return true;
      else return false;
   }

   moveFigure(e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;

      let limit = false;

      if (e.key === 'ArrowLeft') {
         let movedCoords = [];
         this.currentState.activeFigure.coords.forEach(coord => {
            if (coord.x - 1 < 1) limit = true;
            movedCoords.push({ x: limit ? coord.x : coord.x - 1, y: coord.y });
         });

         if (movedCoords.some(val => this.checkCollision(val.x, val.y))) limit = true;

         if (!limit) this.currentState.activeFigure.coords = movedCoords;
         if (this.currentState.activeFigure.top) this.currentState.activeFigure.top = { x: limit ? this.currentState.activeFigure.top.x : this.currentState.activeFigure.top.x - 1, y: this.currentState.activeFigure.top.y };
      }
      if (e.key === 'ArrowRight') {
         let movedCoords = [];
         this.currentState.activeFigure.coords.forEach(coord => {
            if (coord.x + 1 > this.canvasConfig.collsCount) limit = true;
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
            if (!this.currentState.activeFigure.top) movedCoords.push(coord);
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

      const figuresList = [figures.line, figures.square, figures.tetraL, figures.tetraLInverse, figures.tetraZ, figures.tetraS, figures.tetraT];

      let figure = figuresList[randomInteger(0, figuresList.length - 1)];

      let colorList = Object.values(COLORS);
      if (this.currentState.activeFigure) colorList = colorList.filter(hex => hex !== this.currentState.activeFigure.color)

      figure.color = colorList[randomInteger(0, colorList.length - 1)];

      return figure;
   }

   getOffset90(oY, oX, pointX, pointY) {
      return { x: (oX + oY) - pointY, y: pointX - (oY - oX) }
   }

   endGame() {
      clearInterval(intervalId);
      this.intervalId = null;
      console.log('the end');
   }
}

let game = new Game();

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