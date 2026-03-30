const EXACT = 0;
const LOWERBOUND = 1;
const UPPERBOUND = 2;

const SCORE_FIVE = 10000000;
const SCORE_FOUR = 100000;
const SCORE_OPEN_THREE = 10000;
const SCORE_THREE = 1000;
const SCORE_OPEN_TWO = 100;
const SCORE_TWO = 10;

class GomokuAI {
    constructor(engine, isBlack = false) {
        this.engine = engine;
        this.aiPlayer = isBlack ? 1 : 2;
        this.humanPlayer = isBlack ? 2 : 1;
        this.transpositionTable = new Map();
        this.timeLimit = 3000; // ms
        this.startTime = 0;
        this.timeOut = false;
        this.nodesEvaluated = 0;
        
        this.MAX_TT_SIZE = 1000000;
    }

    getBestMove(timeLimit = 3000) {
        this.timeLimit = timeLimit;
        this.startTime = Date.now();
        this.timeOut = false;
        this.nodesEvaluated = 0;
        
        if (this.engine.history.length === 0) {
            return { r: 7, c: 7 };
        }

        let bestMove = null;
        let depth = 1;

        while (true) {
            let move = this.searchDepth(depth);
            
            if (this.timeOut) {
                break; 
            }
            if (move) {
                bestMove = move;
                if (bestMove.score >= SCORE_FIVE / 2) {
                    break; // Immediate win found
                }
            }
            depth++;
            if (depth > 20) break; 
        }

        console.log(`[AI] Depth reached: ${depth-1}, Nodes: ${this.nodesEvaluated}, Best Score: ${bestMove ? bestMove.score : 0}`);

        if (!bestMove) {
           let moves = this.generateMoves(this.aiPlayer);
           if (moves.length > 0) bestMove = moves[0];
        }

        return bestMove;
    }

    searchDepth(depth) {
        let alpha = -Infinity;
        let beta = Infinity;
        let bestScore = -Infinity;
        let bestMove = null;

        const candidateMoves = this.generateMoves(this.aiPlayer);
        if (candidateMoves.length === 0) return null;

        for (let i = 0; i < candidateMoves.length; i++) {
            let move = candidateMoves[i];
            
            this.engine.placeStone(move.r, move.c, true);
            let score = this.minimax(depth - 1, alpha, beta, false);
            this.engine.undo();

            if (this.timeOut) return null;

            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
                bestMove.score = score;
            }

            alpha = Math.max(alpha, bestScore);
        }
        
        return bestMove;
    }

    minimax(depth, alpha, beta, isMaximizing) {
        this.nodesEvaluated++;

        if (this.nodesEvaluated % 100 === 0 && (Date.now() - this.startTime) > this.timeLimit) {
            this.timeOut = true;
            return 0;
        }

        const ttEntry = this.transpositionTable.get(this.engine.zobristHash);
        if (ttEntry && ttEntry.depth >= depth) {
            if (ttEntry.flag === EXACT) return ttEntry.score;
            if (ttEntry.flag === LOWERBOUND && ttEntry.score >= beta) return ttEntry.score;
            if (ttEntry.flag === UPPERBOUND && ttEntry.score <= alpha) return ttEntry.score;
        }

        const currentPlayer = isMaximizing ? this.aiPlayer : this.humanPlayer;

        const lastMove = this.engine.history[this.engine.history.length - 1];
        if (lastMove) {
            const winStatus = this.engine.checkWin(lastMove.r, lastMove.c, lastMove.player);
            if (winStatus.win) {
                // Shorter paths to win are better
                return lastMove.player === this.aiPlayer ? SCORE_FIVE + depth : -SCORE_FIVE - depth;
            }
        }

        if (depth === 0) {
            let evalScore = this.evaluateBoard();
            this.storeTT(depth, evalScore, EXACT);
            return evalScore;
        }

        const candidateMoves = this.generateMoves(currentPlayer);
        if (candidateMoves.length === 0) return 0; // Draw

        let origAlpha = alpha;
        let bestScore = isMaximizing ? -Infinity : Infinity;

        for (let i = 0; i < candidateMoves.length; i++) {
            let move = candidateMoves[i];
            
            this.engine.placeStone(move.r, move.c, true);
            let score = this.minimax(depth - 1, alpha, beta, !isMaximizing);
            this.engine.undo();

            if (this.timeOut) return 0;

            if (isMaximizing) {
                bestScore = Math.max(bestScore, score);
                alpha = Math.max(alpha, bestScore);
            } else {
                bestScore = Math.min(bestScore, score);
                beta = Math.min(beta, bestScore);
            }

            if (beta <= alpha) {
                break; // Alpha-beta pruning
            }
        }

        let ttFlag = EXACT;
        if (bestScore <= origAlpha) ttFlag = UPPERBOUND;
        else if (bestScore >= beta) ttFlag = LOWERBOUND;

        this.storeTT(depth, bestScore, ttFlag);

        return bestScore;
    }

    storeTT(depth, score, flag) {
        if (this.transpositionTable.size > this.MAX_TT_SIZE) {
            this.transpositionTable.clear();
        }
        this.transpositionTable.set(this.engine.zobristHash, { depth, score, flag });
    }

    generateMoves(player) {
        const moves = [];
        const checked = new Uint8Array(225);

        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];

        for (let r = 0; r < 15; r++) {
            for (let c = 0; c < 15; c++) {
                if (this.engine.board[r][c] !== 0) {
                    for (let d of directions) {
                        for (let step = 1; step <= 2; step++) {
                            let nr = r + d[0] * step;
                            let nc = c + d[1] * step;
                            
                            if (nr >= 0 && nr < 15 && nc >= 0 && nc < 15) {
                                let idx = nr * 15 + nc;
                                if (this.engine.board[nr][nc] === 0 && !checked[idx]) {
                                    checked[idx] = 1;
                                    if (player === 1 && this.engine.isForbidden(nr, nc)) continue;
                                    
                                    let score = this.scoreMoveDirectly(nr, nc, player);
                                    moves.push({ r: nr, c: nc, score });
                                }
                            }
                        }
                    }
                }
            }
        }

        return moves.sort((a, b) => b.score - a.score).slice(0, 20); // Top branch limit for Gomoku scaling
    }

    scoreMoveDirectly(r, c, player) {
        const opponent = player === 1 ? 2 : 1;
        
        let atkScore = this.evaluateSpot(r, c, player);
        let defScore = this.evaluateSpot(r, c, opponent);
        
        if (defScore >= SCORE_FIVE) return SCORE_FIVE + 50; 
        if (atkScore >= SCORE_FIVE) return SCORE_FIVE + 100;

        return atkScore + defScore * 0.9;
    }

    evaluateSpot(r, c, player) {
        const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
        let total = 0;
        for (let d of dirs) {
            total += this.evaluatePatternCentered(r, c, d[0], d[1], player);
        }
        return total;
    }

    evaluatePatternCentered(r, c, dr, dc, player) {
        let consec = 1;
        let block = 0;

        let nr = r + dr, nc = c + dc;
        while (nr >= 0 && nr < 15 && nc >= 0 && nc < 15) {
            if (this.engine.board[nr][nc] === player) { consec++; nr += dr; nc += dc; }
            else if (this.engine.board[nr][nc] === 0) { break; }
            else { block++; break; }
        }
        if (!(nr >= 0 && nr < 15 && nc >= 0 && nc < 15)) block++;

        nr = r - dr; nc = c - dc;
        while (nr >= 0 && nr < 15 && nc >= 0 && nc < 15) {
            if (this.engine.board[nr][nc] === player) { consec++; nr -= dr; nc -= dc; }
            else if (this.engine.board[nr][nc] === 0) { break; }
            else { block++; break; }
        }
        if (!(nr >= 0 && nr < 15 && nc >= 0 && nc < 15)) block++;

        if (consec >= 5) return SCORE_FIVE;
        if (consec === 4) return block === 0 ? SCORE_FOUR : SCORE_FOUR / 2;
        if (consec === 3) return block === 0 ? SCORE_OPEN_THREE : SCORE_THREE;
        if (consec === 2) return block === 0 ? SCORE_OPEN_TWO : SCORE_TWO;
        return 1;
    }

    evaluateBoard() {
        let scoreAI = 0;
        let scoreHuman = 0;
        
        const board = this.engine.board;
        
        for (let r = 0; r < 15; r++) {
            for (let c = 0; c < 15; c++) {
                let p = board[r][c];
                if (p === 0) continue;
                
                if (c === 0 || board[r][c - 1] !== p) {
                    let s = this.evalDir(r, c, 0, 1, p);
                    if (p === this.aiPlayer) scoreAI += s; else scoreHuman += s;
                }
                if (r === 0 || board[r - 1][c] !== p) {
                    let s = this.evalDir(r, c, 1, 0, p);
                    if (p === this.aiPlayer) scoreAI += s; else scoreHuman += s;
                }
                if (r === 0 || c === 0 || board[r - 1][c - 1] !== p) {
                    let s = this.evalDir(r, c, 1, 1, p);
                    if (p === this.aiPlayer) scoreAI += s; else scoreHuman += s;
                }
                if (r === 0 || c === 14 || board[r - 1][c + 1] !== p) {
                    let s = this.evalDir(r, c, 1, -1, p);
                    if (p === this.aiPlayer) scoreAI += s; else scoreHuman += s;
                }
            }
        }
        
        // Defensive play bias slightly
        return scoreAI - (scoreHuman * 1.5);
    }

    evalDir(r, c, dr, dc, p) {
        let count = 0;
        let nr = r, nc = c;
        while (nr >= 0 && nr < 15 && nc >= 0 && nc < 15 && this.engine.board[nr][nc] === p) {
            count++;
            nr += dr; nc += dc;
        }
        
        let block = 0;
        let sr = r - dr, sc = c - dc;
        if (sr < 0 || sr >= 15 || sc < 0 || sc >= 15 || this.engine.board[sr][sc] !== 0) block++;
        if (nr < 0 || nr >= 15 || nc < 0 || nc >= 15 || this.engine.board[nr][nc] !== 0) block++;
        
        if (count >= 5) return SCORE_FIVE;
        if (count === 4) return block === 0 ? SCORE_FOUR : SCORE_FOUR / 2;
        if (count === 3) return block === 0 ? SCORE_OPEN_THREE : SCORE_THREE;
        if (count === 2) return block === 0 ? SCORE_OPEN_TWO : SCORE_TWO;
        return 0;
    }
}
