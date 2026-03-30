class GomokuAIEasy {
    constructor(engine, isBlack = false) {
        this.engine = engine;
        this.aiPlayer = isBlack ? BLACK : WHITE;
        this.humanPlayer = isBlack ? WHITE : BLACK;
        this.maxDepth = 3;
    }

    async getBestMove() {
        // Yield to allow UI to show "Thinking..."
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // If first move and board empty, play in the center
        if (this.engine.history.length === 0) {
            return { r: 7, c: 7 };
        }
        
        let bestScore = -Infinity;
        let bestMove = null;
        let alpha = -Infinity;
        let beta = Infinity;
        
        const candidateMoves = this.getCandidateMoves(this.engine.board, this.aiPlayer);
        
        // Optimize search space: Sort candidate moves based on a quick static evaluation
        candidateMoves.sort((a, b) => b.score - a.score);
        
        for (let move of candidateMoves) {
            // Apply move
            this.engine.placeStone(move.r, move.c, false);
            
            // Eval recursively
            let score = this.minimax(this.engine.board, this.maxDepth - 1, alpha, beta, false);
            
            // Undo move
            this.engine.removeStone(move.r, move.c);
            
            if (score > bestScore) {
                bestScore = score;
                bestMove = { r: move.r, c: move.c };
            }
            alpha = Math.max(alpha, bestScore);
            
            if (alpha >= beta) break;
        }

        // Failsafe move
        if (!bestMove) {
            bestMove = candidateMoves[0];
        }

        return bestMove;
    }

    minimax(board, depth, alpha, beta, isMaximizingPlayer) {
        if (depth === 0) {
            return this.evaluateBoard(board);
        }

        const currentPlayer = isMaximizingPlayer ? this.aiPlayer : this.humanPlayer;
        
        // Check terminal state (win/lose)
        const lastMove = this.engine.history[this.engine.history.length - 1]; // Simplified
        if (lastMove) {
            const winStatus = this.engine.checkWin(lastMove.r, lastMove.c, lastMove.player);
            if (winStatus.win) {
                return isMaximizingPlayer ? -1000000 + depth : 1000000 - depth; // Win faster is better
            }
        }

        const candidateMoves = this.getCandidateMoves(board, currentPlayer);
        
        if (candidateMoves.length === 0) return 0; // Draw
        
        if (isMaximizingPlayer) {
            let maxEval = -Infinity;
            for (let move of candidateMoves) {
                this.engine.board[move.r][move.c] = currentPlayer; // temp place
                this.engine.history.push({r: move.r, c: move.c, player: currentPlayer});
                
                let evalScore = this.minimax(board, depth - 1, alpha, beta, false);
                
                this.engine.history.pop();
                this.engine.board[move.r][move.c] = EMPTY; // undo
                
                maxEval = Math.max(maxEval, evalScore);
                alpha = Math.max(alpha, evalScore);
                if (beta <= alpha) break; // Prune
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (let move of candidateMoves) {
                this.engine.board[move.r][move.c] = currentPlayer; // temp place
                this.engine.history.push({r: move.r, c: move.c, player: currentPlayer});
                
                let evalScore = this.minimax(board, depth - 1, alpha, beta, true);
                
                this.engine.history.pop();
                this.engine.board[move.r][move.c] = EMPTY; // undo
                
                minEval = Math.min(minEval, evalScore);
                beta = Math.min(beta, evalScore);
                if (beta <= alpha) break; // Prune
            }
            return minEval;
        }
    }

    // Get cells adjacent to existing stones (distance up to 2)
    getCandidateMoves(board, player) {
        const moves = new Set();
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];
        
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (board[r][c] !== EMPTY) {
                    // Check neighbors
                    for (let d of directions) {
                        for(let step=1; step<=2; step++) {
                            let nr = r + d[0]*step;
                            let nc = c + d[1]*step;
                            if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc] === EMPTY) {
                                // For Black, skip forbidden spots
                                if(player === BLACK && this.engine.isForbidden(nr, nc)) continue;
                                moves.add(`${nr},${nc}`);
                            }
                        }
                    }
                }
            }
        }
        
        let candidates = Array.from(moves).map(str => {
            let parts = str.split(',');
            return { r: parseInt(parts[0]), c: parseInt(parts[1]) };
        });

        // Quick evaluate to sort
        candidates.forEach(move => {
            move.score = this.quickEvaluate(move.r, move.c, player);
        });

        // Limit candidates to reduce branching factor (top 20 moves)
        return candidates.sort((a,b) => b.score - a.score).slice(0, 20);
    }

    quickEvaluate(r, c, player) {
        // Simulate playing the stone
        this.engine.board[r][c] = player;
        let score = this.evaluateSpot(r, c, player);
        
        // Calculate opponent threat if we DON'T play here (block score)
        let opponent = player === BLACK ? WHITE : BLACK;
        this.engine.board[r][c] = opponent;
        let blockScore = this.evaluateSpot(r, c, opponent);
        
        this.engine.board[r][c] = EMPTY; // revert
        
        return score + blockScore * 0.9; // Prioritize own attack slightly more than blocking in static eval, but blocking high threats is critical.
    }

    // Evaluate the board statically from AI's perspective
    evaluateBoard(board) {
        let aiScore = 0;
        let humanScore = 0;
        
        // Evaluate only spots around recently placed stones for performance
        // Actually, a full board scan is more accurate.
        // We will scan lines instead for efficiency.
        const dirs = [
            [0, 1], // Horiz
            [1, 0], // Vert
            [1, 1], // Diag \
            [1, -1] // Diag /
        ];

        // This is a simplified evaluator that scores lines.
        for(let r=0; r<BOARD_SIZE; r++) {
            for(let c=0; c<BOARD_SIZE; c++) {
                if(board[r][c] !== EMPTY) {
                    let player = board[r][c];
                    let score = this.evaluateSpot(r, c, player) * (player === this.aiPlayer ? 1 : -1.2); 
                    // Bias towards blocking (human gets higher weight)
                    if(player === this.aiPlayer) aiScore += score;
                    else humanScore += score;
                }
            }
        }
        return aiScore + humanScore;
    }

    evaluateSpot(r, c, player) {
        const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
        let totalScore = 0;

        for (let dir of dirs) {
            totalScore += this.evaluateDirection(r, c, dir[0], dir[1], player);
        }
        return totalScore;
    }

    evaluateDirection(r, c, dr, dc, player) {
        let count = 1;
        let openEnds = 0;
        
        // Forward
        let nr = r + dr, nc = c + dc;
        while (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && this.engine.board[nr][nc] === player) {
            count++;
            nr += dr; nc += dc;
        }
        if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && this.engine.board[nr][nc] === EMPTY) {
            openEnds++;
        }

        // Backward
        nr = r - dr; nc = c - dc;
        while (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && this.engine.board[nr][nc] === player) {
            count++;
            nr -= dr; nc -= dc;
        }
        if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && this.engine.board[nr][nc] === EMPTY) {
            openEnds++;
        }

        // Score based on heuristic provided:
        if (count >= 5) return 100000;
        if (count === 4) {
            if (openEnds === 2) return 20000; // Open 4 (certain win)
            if (openEnds === 1) return 10000; // Blocked 4
        }
        if (count === 3) {
            if (openEnds === 2) return 1000;  // Open 3
            if (openEnds === 1) return 100;   // Blocked 3
        }
        if (count === 2) {
            if (openEnds === 2) return 10;
        }
        return 1;
    }
}
