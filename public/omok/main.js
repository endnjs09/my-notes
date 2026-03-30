const engine = new GomokuEngine();
let renderer;
let ai = null;
let aiPlayerId = -1;
let aiFirstToggle;
let renjuToggle;
let difficultySelect;
let isAiThinking = false;
let gameMode = 'PvE'; 

document.addEventListener('DOMContentLoaded', () => {
    renderer = new GomokuRenderer('game-canvas', engine);
    aiFirstToggle = document.getElementById('ai-first-toggle');
    renjuToggle = document.getElementById('renju-toggle');
    difficultySelect = document.getElementById('difficulty-select');
    
    initGame();

    // Event Listeners
    document.getElementById('btn-restart').addEventListener('click', initGame);
    document.getElementById('btn-modal-restart').addEventListener('click', () => {
        document.getElementById('game-over-modal').classList.add('hidden');
        initGame();
    });
    
    document.getElementById('btn-undo').addEventListener('click', () => {
        if(engine.history.length === 0 || isAiThinking) return;
        
        // Undo in main thread
        engine.undo();
        if(gameMode === 'PvE' && engine.currentTurn !== (aiFirstToggle.checked ? WHITE : BLACK)) {
            engine.undo();
        }
        
        renderer.draw();
        updateUI();
    });

    aiFirstToggle.addEventListener('change', initGame);
    difficultySelect.addEventListener('change', initGame);
    
    renderer.canvas.addEventListener('click', handlePlayerClick);
});

function initGame() {
    engine.reset();
    isAiThinking = false;
    document.getElementById('game-over-modal').classList.add('hidden');
    
    const isAiBlack = aiFirstToggle.checked;
    aiPlayerId = isAiBlack ? BLACK : WHITE;
    
    if (difficultySelect.value === 'easy') {
        ai = new GomokuAIEasy(engine, isAiBlack);
    } else {
        ai = new GomokuAI(engine, isAiBlack);
    }
    
    updateUI();
    renderer.draw();
    
    if (isAiBlack && engine.currentTurn === BLACK) {
        startAITurn();
    }
}

function handlePlayerClick(e) {
    if (engine.gameOver || isAiThinking) return;
    
    const {r, c} = renderer.getClickCoords(e);
    
    if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) return;
    
    if (engine.currentTurn === BLACK && renjuToggle.checked) {
        if (engine.isForbidden(r, c)) {
            return;
        }
    }
    
    if (engine.placeStone(r, c)) {
        renderer.draw();
        updateUI();
        
        if (engine.gameOver) {
            showWinner();
            return;
        }
        
        if (gameMode === 'PvE') {
            startAITurn();
        }
    }
}

function startAITurn() {
    isAiThinking = true;
    document.getElementById('ai-thinking').classList.remove('hidden');
    renderer.canvas.style.cursor = 'wait';
    updateUI();
    
    // We use setTimeout to let the DOM update "Thinking..." before blocking thread
    setTimeout(async () => {
        let bestMove;
        if (difficultySelect.value === 'easy') {
            bestMove = await ai.getBestMove();
        } else {
            bestMove = ai.getBestMove(5000); 
        }
        handleAIMove(bestMove);
    }, 50);
}

function handleAIMove(move) {
    if (engine.gameOver) return;
    engine.placeStone(move.r, move.c);
    
    isAiThinking = false;
    document.getElementById('ai-thinking').classList.add('hidden');
    renderer.canvas.style.cursor = 'crosshair';
    
    renderer.draw();
    updateUI();
    
    if (engine.gameOver) {
        showWinner();
    }
}

function updateUI() {
    const preview = document.getElementById('current-turn-stone');
    const turnText = document.getElementById('turn-text');
    
    if (engine.currentTurn === BLACK) {
        preview.className = 'stone-preview black';
        if(gameMode === 'PvE' && aiFirstToggle.checked) turnText.innerText = 'AI Turn (Black)';
        else turnText.innerText = 'Your Turn (Black)';
    } else {
        preview.className = 'stone-preview white';
        if(gameMode === 'PvE' && !aiFirstToggle.checked) turnText.innerText = 'AI Turn (White)';
        else turnText.innerText = 'Your Turn (White)';
    }

    if(engine.history.length > 0 && isAiThinking) {
         document.getElementById('btn-undo').disabled = true;
    } else {
         document.getElementById('btn-undo').disabled = false;
    }
}

function showWinner() {
    const modal = document.getElementById('game-over-modal');
    const winnerText = document.getElementById('winner-text');
    const winnerDesc = document.getElementById('winner-desc');
    
    modal.classList.remove('hidden');
    
    let winnerName = engine.winner === BLACK ? 'Black' : 'White';
    let isAiWinner = (engine.winner === aiPlayerId);
    
    winnerText.innerText = `${winnerName} Wins!`;
    
    if (gameMode === 'PvE') {
        if (isAiWinner) {
            winnerText.style.color = '#ef4444'; 
            winnerDesc.innerText = 'The AI outsmarted you this time!';
        } else {
            winnerText.style.color = '#34d399'; 
            winnerDesc.innerText = 'Congratulations! You beat the Machine!';
        }
    } else {
        winnerDesc.innerText = 'Well played!';
    }
}
