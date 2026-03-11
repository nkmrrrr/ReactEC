import React from 'react';
import './GameUI.css';

export default function GameUI({ gameState, onRestart }) {
  const { hp, maxHp, gas, maxGas, score, kills, combo, titanCount, isWired, gameOver, gameStarted, message, messageTimer } = gameState;

  if (!gameStarted) return null;

  const hpPercent = (hp / maxHp) * 100;
  const gasPercent = (gas / maxGas) * 100;
  const hpColor = hpPercent > 50 ? '#4caf50' : hpPercent > 25 ? '#ff9800' : '#f44336';
  const gasColor = gasPercent > 30 ? '#2196f3' : '#ff5722';

  return (
    <div className="game-ui">
      {/* Top HUD */}
      <div className="hud-top">
        <div className="hud-left">
          {/* HP Bar */}
          <div className="stat-bar hp-bar">
            <div className="stat-label">HP</div>
            <div className="bar-bg">
              <div
                className="bar-fill"
                style={{ width: `${hpPercent}%`, backgroundColor: hpColor }}
              />
            </div>
            <div className="stat-value">{hp}</div>
          </div>
          {/* Gas Bar */}
          <div className="stat-bar gas-bar">
            <div className="stat-label">GAS</div>
            <div className="bar-bg">
              <div
                className="bar-fill gas-fill"
                style={{ width: `${gasPercent}%`, backgroundColor: gasColor }}
              />
            </div>
            <div className="stat-value">{gas}</div>
          </div>
        </div>

        <div className="hud-right">
          <div className="score-display">
            <span className="score-label">SCORE</span>
            <span className="score-value">{score.toLocaleString()}</span>
          </div>
          <div className="kill-display">
            <span className="kill-label">討伐</span>
            <span className="kill-value">{kills}</span>
          </div>
        </div>
      </div>

      {/* Wire indicator */}
      {isWired && (
        <div className="wire-indicator">
          ワイヤー展開中
        </div>
      )}

      {/* Combo display */}
      {combo > 1 && (
        <div className="combo-display">
          <span className="combo-count">{combo}</span>
          <span className="combo-label">COMBO!</span>
        </div>
      )}

      {/* Titan count */}
      <div className="titan-count">
        <span className="titan-icon">👹</span>
        <span className="titan-num">×{titanCount}</span>
      </div>

      {/* Center message */}
      {message && messageTimer > 0 && (
        <div className="center-message">
          {message}
        </div>
      )}

      {/* Game Over screen */}
      {gameOver && (
        <div className="game-over-overlay">
          <div className="game-over-content">
            <h2 className="game-over-title">GAME OVER</h2>
            <div className="game-over-stats">
              <div className="go-stat">
                <span className="go-stat-label">スコア</span>
                <span className="go-stat-value">{score.toLocaleString()}</span>
              </div>
              <div className="go-stat">
                <span className="go-stat-label">討伐数</span>
                <span className="go-stat-value">{kills}</span>
              </div>
            </div>
            <button className="restart-btn" onClick={onRestart}>
              再挑戦
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
