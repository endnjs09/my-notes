class GomokuRenderer {
    constructor(canvasId, engine) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.engine = engine;
        
        this.padding = 30; // Board padding
        this.gridSize = 0; // Size of each cell
        this.stoneStyle = '3D'; // 3D or Flat
        
        // Mouse hover tracking
        this.hoverR = -1;
        this.hoverC = -1;

        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        // Mouse move
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const r = Math.round((y - this.padding) / this.gridSize);
            const c = Math.round((x - this.padding) / this.gridSize);
            
            if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
                if (this.hoverR !== r || this.hoverC !== c) {
                    this.hoverR = r;
                    this.hoverC = c;
                    this.draw();
                }
            } else {
                if (this.hoverR !== -1) {
                    this.hoverR = -1;
                    this.hoverC = -1;
                    this.draw();
                }
            }
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.hoverR = -1;
            this.hoverC = -1;
            this.draw();
        });
    }

    resize() {
        // Find best size for canvas
        const container = this.canvas.parentElement;
        const size = Math.min(container.clientWidth, window.innerHeight * 0.7);
        
        this.canvas.width = size;
        this.canvas.height = size;
        
        this.gridSize = (size - this.padding * 2) / (BOARD_SIZE - 1);
        this.draw();
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawGrid();
        this.drawStones();
        this.drawHover();
        
        if (this.engine.gameOver && this.engine.winningCells.length > 0) {
            this.drawWinLine();
        }
    }

    drawGrid() {
        this.ctx.beginPath();
        this.ctx.strokeStyle = '#5c4033'; // dark wood color for lines
        this.ctx.lineWidth = 1;

        for (let i = 0; i < BOARD_SIZE; i++) {
            const pos = this.padding + i * this.gridSize;
            
            // vertical line
            this.ctx.moveTo(pos, this.padding);
            this.ctx.lineTo(pos, this.canvas.height - this.padding);
            
            // horizontal line
            this.ctx.moveTo(this.padding, pos);
            this.ctx.lineTo(this.canvas.width - this.padding, pos);
        }
        this.ctx.stroke();

        // Draw star points (화점)
        const starPoints = [
            [3, 3], [3, 11], [11, 3], [11, 11], [7, 7]
        ];
        
        this.ctx.fillStyle = '#5c4033';
        for (let pt of starPoints) {
            this.ctx.beginPath();
            const x = this.padding + pt[1] * this.gridSize;
            const y = this.padding + pt[0] * this.gridSize;
            this.ctx.arc(x, y, 4, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    drawStones() {
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (this.engine.board[r][c] !== EMPTY) {
                    this.drawStone(r, c, this.engine.board[r][c]);
                }
            }
        }

        // Highlight last move
        if (this.engine.history.length > 0) {
            const lastMove = this.engine.history[this.engine.history.length - 1];
            this.ctx.beginPath();
            const x = this.padding + lastMove.c * this.gridSize;
            const y = this.padding + lastMove.r * this.gridSize;
            this.ctx.fillStyle = lastMove.player === BLACK ? 'white' : 'red';
            this.ctx.arc(x, y, 3, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    drawStone(r, c, player, opacity = 1) {
        const x = this.padding + c * this.gridSize;
        const y = this.padding + r * this.gridSize;
        const radius = this.gridSize * 0.45;

        // Shadow
        this.ctx.beginPath();
        this.ctx.arc(x + 2, y + 3, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(0,0,0,${0.3 * opacity})`;
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);

        if (player === BLACK) {
            const gradient = this.ctx.createRadialGradient(x - radius/3, y - radius/3, radius/10, x, y, radius);
            gradient.addColorStop(0, `rgba(80, 80, 80, ${opacity})`);
            gradient.addColorStop(1, `rgba(10, 10, 10, ${opacity})`);
            this.ctx.fillStyle = gradient;
        } else {
            const gradient = this.ctx.createRadialGradient(x - radius/3, y - radius/3, radius/10, x, y, radius);
            gradient.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
            gradient.addColorStop(1, `rgba(200, 200, 200, ${opacity})`);
            this.ctx.fillStyle = gradient;
        }

        this.ctx.fill();
    }

    drawHover() {
        if (this.engine.gameOver) return;
        if (this.hoverR !== -1 && this.hoverC !== -1 && this.engine.board[this.hoverR][this.hoverC] === EMPTY) {
            
            // Check if Renju forbidden
            const isForbidden = !this.engine.isValidMove(this.hoverR, this.hoverC, document.getElementById('renju-toggle').checked);
            
            if (isForbidden && this.engine.currentTurn === BLACK) {
                // Draw X symbol for forbidden
                const x = this.padding + this.hoverC * this.gridSize;
                const y = this.padding + this.hoverR * this.gridSize;
                this.ctx.beginPath();
                this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
                this.ctx.lineWidth = 3;
                this.ctx.moveTo(x - 8, y - 8);
                this.ctx.lineTo(x + 8, y + 8);
                this.ctx.moveTo(x + 8, y - 8);
                this.ctx.lineTo(x - 8, y + 8);
                this.ctx.stroke();
            } else {
                this.drawStone(this.hoverR, this.hoverC, this.engine.currentTurn, 0.4);
            }
        }
    }

    drawWinLine() {
        if (this.engine.winningCells.length < 5) return;
        
        this.ctx.beginPath();
        this.ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)'; // Red line
        this.ctx.lineWidth = 4;
        this.ctx.lineCap = 'round';
        
        const first = this.engine.winningCells[0];
        const last = this.engine.winningCells[this.engine.winningCells.length - 1];
        
        // Extend line slightly past centers
        const x1 = this.padding + first[1] * this.gridSize;
        const y1 = this.padding + first[0] * this.gridSize;
        const x2 = this.padding + last[1] * this.gridSize;
        const y2 = this.padding + last[0] * this.gridSize;
        
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
    }

    getClickCoords(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const r = Math.round((y - this.padding) / this.gridSize);
        const c = Math.round((x - this.padding) / this.gridSize);
        
        return {r, c};
    }
}
