const engine = new GomokuEngine();
let renderer;
let ai;
let aiFirstToggle;
let renjuToggle;
let isAiThinking = false;
let gameMode = 'PvE'; // Player vs Environment

document.addEventListener('DOMContentLoaded', () => {
    renderer = new GomokuRenderer('game-canvas', engine);
    aiFirstToggle = document.getElementById('ai-first-toggle');
    renjuToggle = document.getElementById('renju-toggle');
    
    initGame();

    // Event Listeners
    document.getElementById('btn-restart').addEventListener('click', initGame);
    document.getElementById('btn-modal-restart').addEventListener('click', () => {
        document.getElementById('game-over-modal').classList.add('hidden');
        initGame();
    });
    
    document.getElementById('btn-undo').addEventListener('click', () => {
        if(engine.history.length === 0 || isAiThinking) return;
        // Undo twice to revert AI's move and player's move
        engine.undo();
        if(gameMode === 'PvE' && engine.currentTurn !== (aiFirstToggle.checked ? WHITE : BLACK)) {
            engine.undo();
        }
        renderer.draw();
        updateUI();
    });

    aiFirstToggle.addEventListener('change', initGame);
    
    renderer.canvas.addEventListener('click', handlePlayerClick);
});

async function initGame() {
    engine.reset();
    isAiThinking = false;
    document.getElementById('game-over-modal').classList.add('hidden');
    
    const isAiBlack = aiFirstToggle.checked;
    ai = new GomokuAI(engine, isAiBlack);
    
    updateUI();
    renderer.draw();
    
    if (isAiBlack && engine.currentTurn === BLACK) {
        await playAITrun();
    }
}

async function handlePlayerClick(e) {
    if (engine.gameOver || isAiThinking) return;
    
    const {r, c} = renderer.getClickCoords(e);
    
    if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) return;
    
    // Check Renju for Black
    if (engine.currentTurn === BLACK && renjuToggle.checked) {
        if (engine.isForbidden(r, c)) {
            // Flash red on hover or play error sound
            return;
        }
    }
    
    // Attempt place
    if (engine.placeStone(r, c)) {
        renderer.draw();
        updateUI();
        
        if (engine.gameOver) {
            showWinner();
            return;
        }
        
        if (gameMode === 'PvE') {
            await playAITrun();
        }
    }
}

async function playAITrun() {
    isAiThinking = true;
    document.getElementById('ai-thinking').classList.remove('hidden');
    renderer.canvas.style.cursor = 'wait';
    
    // Allow UI to paint before blocking JS thread
    await new Promise(r => setTimeout(r, 50));
    
    const move = await ai.getBestMove();
    
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
    let isAiWinner = (engine.winner === ai.aiPlayer);
    
    winnerText.innerText = `${winnerName} Wins!`;
    
    if (gameMode === 'PvE') {
        if (isAiWinner) {
            winnerText.style.color = '#ef4444'; // Red for lost
            winnerDesc.innerText = 'The AI outsmarted you this time!';
        } else {
            winnerText.style.color = '#34d399'; // Green for win
            winnerDesc.innerText = 'Congratulations! You beat the Machine!';
        }
    } else {
        winnerDesc.innerText = 'Well played!';
    }
}
