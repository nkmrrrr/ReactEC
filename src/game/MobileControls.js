import React, { useRef, useCallback, useEffect } from 'react';
import './MobileControls.css';

export default function MobileControls({ inputRef }) {
  const joystickRef = useRef(null);
  const joystickKnobRef = useRef(null);
  const joystickActive = useRef(false);
  const joystickOrigin = useRef({ x: 0, y: 0 });
  const joystickTouchId = useRef(null);

  const JOYSTICK_RADIUS = 50;

  // ===== Joystick Touch Handlers =====
  const handleJoystickStart = useCallback((e) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    joystickTouchId.current = touch.identifier;
    joystickActive.current = true;
    const rect = joystickRef.current.getBoundingClientRect();
    joystickOrigin.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }, []);

  const handleJoystickMove = useCallback((e) => {
    e.preventDefault();
    if (!joystickActive.current) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier !== joystickTouchId.current) continue;

      let dx = touch.clientX - joystickOrigin.current.x;
      let dy = touch.clientY - joystickOrigin.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > JOYSTICK_RADIUS) {
        dx = (dx / dist) * JOYSTICK_RADIUS;
        dy = (dy / dist) * JOYSTICK_RADIUS;
      }

      if (joystickKnobRef.current) {
        joystickKnobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
      }

      const normalizedX = dx / JOYSTICK_RADIUS;
      const normalizedY = -dy / JOYSTICK_RADIUS; // Invert Y

      inputRef.current.moveX = Math.abs(normalizedX) > 0.15 ? normalizedX : 0;
      inputRef.current.moveY = Math.abs(normalizedY) > 0.15 ? normalizedY : 0;

      // Sprint if pushed to edge
      inputRef.current.sprint = dist > JOYSTICK_RADIUS * 0.85;
    }
  }, [inputRef]);

  const handleJoystickEnd = useCallback((e) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joystickTouchId.current) {
        joystickActive.current = false;
        joystickTouchId.current = null;
        inputRef.current.moveX = 0;
        inputRef.current.moveY = 0;
        inputRef.current.sprint = false;
        if (joystickKnobRef.current) {
          joystickKnobRef.current.style.transform = 'translate(0px, 0px)';
        }
      }
    }
  }, [inputRef]);

  // ===== Button Handlers =====
  const createButtonHandler = useCallback((action) => {
    return {
      onTouchStart: (e) => {
        e.preventDefault();
        inputRef.current[action] = true;
      },
      onTouchEnd: (e) => {
        e.preventDefault();
        if (action !== 'attack' && action !== 'jump' && action !== 'wire') {
          inputRef.current[action] = false;
        }
      },
    };
  }, [inputRef]);

  // Prevent default touch behavior on the control area
  useEffect(() => {
    const preventScroll = (e) => e.preventDefault();
    document.addEventListener('touchmove', preventScroll, { passive: false });
    return () => document.removeEventListener('touchmove', preventScroll);
  }, []);

  return (
    <div className="mobile-controls">
      {/* Left side - Joystick */}
      <div
        className="joystick-area"
        ref={joystickRef}
        onTouchStart={handleJoystickStart}
        onTouchMove={handleJoystickMove}
        onTouchEnd={handleJoystickEnd}
        onTouchCancel={handleJoystickEnd}
      >
        <div className="joystick-base">
          <div className="joystick-knob" ref={joystickKnobRef} />
        </div>
      </div>

      {/* Right side - Action Buttons */}
      <div className="button-area">
        <button
          className="action-btn wire-btn"
          {...createButtonHandler('wire')}
        >
          <span className="btn-icon">🪝</span>
          <span className="btn-label">ワイヤー</span>
        </button>
        <div className="main-buttons">
          <button
            className="action-btn jump-btn"
            {...createButtonHandler('jump')}
          >
            <span className="btn-icon">⬆</span>
            <span className="btn-label">跳</span>
          </button>
          <button
            className="action-btn attack-btn"
            {...createButtonHandler('attack')}
          >
            <span className="btn-icon">⚔</span>
            <span className="btn-label">斬</span>
          </button>
        </div>
      </div>
    </div>
  );
}
