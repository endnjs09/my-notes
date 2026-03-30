const BOARD_SIZE = 15;
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;

class GomokuEngine {
    constructor() {
        this.board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(EMPTY));
        this.history = []; // stores {r, c, player}
        this.currentTurn = BLACK;
        this.gameOver = false;
        this.winner = EMPTY;
        this.winningCells = [];
    }

    reset() {
        this.board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(EMPTY));
        this.history = [];
        this.currentTurn = BLACK;
        this.gameOver = false;
        this.winner = EMPTY;
        this.winningCells = [];
    }

    undo() {
        if (this.history.length === 0 || this.gameOver) return false;
        const lastMove = this.history.pop();
        this.board[lastMove.r][lastMove.c] = EMPTY;
        this.currentTurn = lastMove.player;
        return true;
    }

    placeStone(r, c, updateState = true) {
        if (this.board[r][c] !== EMPTY || this.gameOver) return false;

        if (updateState) {
            this.board[r][c] = this.currentTurn;
            this.history.push({ r, c, player: this.currentTurn });
            
            const winRes = this.checkWin(r, c, this.currentTurn);
            if (winRes.win) {
                this.gameOver = true;
                this.winner = this.currentTurn;
                this.winningCells = winRes.cells;
            } else {
                this.currentTurn = this.currentTurn === BLACK ? WHITE : BLACK;
            }
        } else {
            this.board[r][c] = this.currentTurn;
        }
        return true;
    }

    removeStone(r, c) {
        this.board[r][c] = EMPTY;
    }

    checkWin(r, c, player) {
        const directions = [
            [[0, 1], [0, -1]],   // Horizontal
            [[1, 0], [-1, 0]],   // Vertical
            [[1, 1], [-1, -1]],  // Diagonal \
            [[1, -1], [-1, 1]]   // Diagonal /
        ];

        for (let dir of directions) {
            let count = 1;
            let cells = [[r, c]];
            
            for (let sign of dir) {
                let dr = sign[0], dc = sign[1];
                let nr = r + dr, nc = c + dc;
                while (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && this.board[nr][nc] === player) {
                    count++;
                    cells.push([nr, nc]);
                    nr += dr;
                    nc += dc;
                }
            }

            // Exatcly 5 for win (actually >= 5 for White, but Black overline is handled by Renju rule)
            if (count === 5 || (player === WHITE && count >= 5)) {
                return { win: true, cells: cells };
            }
        }
        return { win: false, cells: [] };
    }

    isValidMove(r, c, renjuRuleEnabled = true) {
        if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE || this.board[r][c] !== EMPTY) {
            return false;
        }

        if (this.currentTurn === BLACK && renjuRuleEnabled) {
            return !this.isForbidden(r, c);
        }

        return true;
    }

    // Basic heuristic for Renju Rule (Forbidden spots for Black)
    // 1. Overline (6 or more)
    // 2. Double 4 (4-4)
    // 3. Double 3 (3-3)
    isForbidden(r, c) {
        this.board[r][c] = BLACK; // temporarily place
        let isForbidden = false;

        const overline = this._checkOverline(r, c);
        if (overline) {
            this.board[r][c] = EMPTY;
            return true;
        }

        const fours = this._countFours(r, c);
        if (fours >= 2) {
            this.board[r][c] = EMPTY;
            return true;
        }

        const openThrees = this._countOpenThrees(r, c);
        if (openThrees >= 2) {
            this.board[r][c] = EMPTY;
            return true;
        }

        this.board[r][c] = EMPTY;
        return false;
    }

    _getLine(r, c, dr, dc) {
        let line = [];
        let nr = r - 5 * dr;
        let nc = c - 5 * dc;
        for (let i = 0; i < 11; i++) {
            if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
                line.push(this.board[nr][nc]);
            } else {
                line.push(-1); // out of bounds
            }
            nr += dr;
            nc += dc;
        }
        return line;
    }

    _checkOverline(r, c) {
        const dirs = [[0,1], [1,0], [1,1], [1,-1]];
        for (let dir of dirs) {
            let count = 1;
            let [dr, dc] = dir;
            // forward
            let nr = r + dr, nc = c + dc;
            while(nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && this.board[nr][nc] === BLACK) { count++; nr+=dr; nc+=dc; }
            // backward
            nr = r - dr; nc = c - dc;
            while(nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && this.board[nr][nc] === BLACK) { count++; nr-=dr; nc-=dc; }
            
            if (count > 5) return true;
        }
        return false;
    }

    _countFours(r, c) {
        // A four is exactly 4 stones and one empty space in a 5-space window
        // But in Renju, it's a move that creates a 4-in-a-row that can instantly become a 5-in-a-row.
        // It can be open (e.g. .XXXX.) or closed (e.g. OXXXX.).
        const dirs = [[0,1], [1,0], [1,1], [1,-1]];
        let fourCount = 0;
        
        for (let dir of dirs) {
            let [dr, dc] = dir;
            let line = this._getLineString(r, c, dr, dc);
            // Replace our position (which is at index 5) with X
            // 1=X, 0=_, 2=O, -1=#
            
            // simple regex or pattern matching for fours
            // A straight four: X X X X _ or _ X X X X or X X X _ X etc.
            // We just look for patterns that contain four 1s and one 0, and not bounded by 1s.
            let countInAxis = 0;
            // The possible patterns for 4
            const patterns = ["01111", "10111", "11011", "11101", "11110"];
            for (let p of patterns) {
                // To avoid overlines, we must ensure the ends are not 1
                let matches = [...line.matchAll(new RegExp("(?<!1)" + p + "(?!1)", 'g'))];
                // But wait, what if the newly placed stone is part of it? 
                // A better approach is: just check if there is an empty spot that creates exactly a 5.
            }
            // Better 4-count heuristic:
            // After placing the stone, look at all empty spots in this axis.
            // If replacing an empty spot causes a 5-in-a-row (and not overline), it's a threat.
            let localThreats = 0;
            for(let i=-4; i<=4; i++) {
                if(i===0) continue;
                let cr = r + i*dr;
                let cc = c + i*dc;
                if(cr>=0 && cr<BOARD_SIZE && cc>=0 && cc<BOARD_SIZE && this.board[cr][cc] === EMPTY) {
                    this.board[cr][cc] = BLACK;
                    let isFive = this._isExactlyFive(cr, cc, dr, dc, BLACK);
                    this.board[cr][cc] = EMPTY;
                    if(isFive) {
                        localThreats++;
                        break; // One axis can only attribute to 1 "four" threat direction. Actually a straight 4 ' _ X X X X _ ' provides two winning spots. But it's considered ONE four.
                    }
                }
            }
            if(localThreats > 0) fourCount++;
        }
        return fourCount;
    }

    _countOpenThrees(r, c) {
        // Find empty spots that when filled, form an "open four".
        // Open four means it has two winning spots.
        const dirs = [[0,1], [1,0], [1,1], [1,-1]];
        let threeCount = 0;

        for (let dir of dirs) {
            let [dr, dc] = dir;
            // Pattern approach or similar empty-spot approach
            // An open three is a three that can grow into an open four.
            let o4_count = 0;
            let validEmptySpots = [];
            for(let i=-4; i<=4; i++) {
                if(i===0) continue;
                let cr = r + i*dr;
                let cc = c + i*dc;
                if(cr>=0 && cr<BOARD_SIZE && cc>=0 && cc<BOARD_SIZE && this.board[cr][cc] === EMPTY) {
                    this.board[cr][cc] = BLACK;
                    // Does it form exactly an open 4?
                    if(this._isOpenFour(cr, cc, dr, dc, BLACK)) {
                        o4_count++;
                    }
                    this.board[cr][cc] = EMPTY;
                }
            }
            if(o4_count > 0) threeCount++;
        }
        return threeCount;
    }

    _isExactlyFive(r, c, dr, dc, player) {
        let count = 1;
        let nr = r + dr, nc = c + dc;
        while(nr>=0 && nr<BOARD_SIZE && nc>=0 && nc<BOARD_SIZE && this.board[nr][nc]===player) { count++; nr+=dr; nc+=dc; }
        nr = r - dr; nc = c - dc;
        while(nr>=0 && nr<BOARD_SIZE && nc>=0 && nc<BOARD_SIZE && this.board[nr][nc]===player) { count++; nr-=dr; nc-=dc; }
        return count === 5;
    }

    _isOpenFour(r, c, dr, dc, player) {
        // An open four is exactly 4 stones, bounded by empty spaces on BOTH ends
        let count = 1;
        
        let nr = r + dr, nc = c + dc;
        while(nr>=0 && nr<BOARD_SIZE && nc>=0 && nc<BOARD_SIZE && this.board[nr][nc]===player) { count++; nr+=dr; nc+=dc; }
        let end1_empty = (nr>=0 && nr<BOARD_SIZE && nc>=0 && nc<BOARD_SIZE && this.board[nr][nc]===EMPTY);
        
        nr = r - dr; nc = c - dc;
        while(nr>=0 && nr<BOARD_SIZE && nc>=0 && nc<BOARD_SIZE && this.board[nr][nc]===player) { count++; nr-=dr; nc-=dc; }
        let end2_empty = (nr>=0 && nr<BOARD_SIZE && nc>=0 && nc<BOARD_SIZE && this.board[nr][nc]===EMPTY);
        
        return count === 4 && end1_empty && end2_empty;
    }

    _getLineString(r, c, dr, dc) {
        return this._getLine(r, c, dr, dc).map(v => v===-1 ? '#' : v).join('');
    }
}
