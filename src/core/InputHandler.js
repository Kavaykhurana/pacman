export class InputHandler {
    constructor() {
        // Current movement intent vector (normalized: -1, 0, 1)
        this.dir = { x: 0, y: 0 };
        
        // P2 movement intent vector (Battle Mode)
        this.p2dir = { x: 0, y: 0 };

        // Action flags
        this.pausePressed = false;
        this.actionPressed = false;

        // Keybind map based on spec
        this.keyBinds = {
            up: ['ArrowUp', 'KeyW'],
            down: ['ArrowDown', 'KeyS'],
            left: ['ArrowLeft', 'KeyA'],
            right: ['ArrowRight', 'KeyD'],
            pause: ['Escape', 'KeyP', 'Enter', 'Space'],
            
            p2up: ['KeyI'],
            p2down: ['KeyK'],
            p2left: ['KeyJ'],
            p2right: ['KeyL']
        };

        // Swipe tracking data
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.minSwipeDistance = 20; // 20px threshold
        this.lastTapTime = 0;
    }

    init() {
        // Keyboard Support
        window.addEventListener('keydown', (e) => this._handleKeyDown(e));
        
        // Disable default actions for game keys to prevent scrolling
        window.addEventListener('keydown', (e) => {
            const allKeys = Object.values(this.keyBinds).flat();
            if (allKeys.includes(e.code)) {
                e.preventDefault();
            }
        }, { passive: false });

        // Touch/Swipe Support
        const container = document.getElementById('game-container');
        if (container) {
            container.addEventListener('touchstart', (e) => this._handleTouchStart(e), { passive: true });
            container.addEventListener('touchend', (e) => this._handleTouchEnd(e), { passive: true });
            container.addEventListener('pointerup', (e) => {
                this.actionPressed = true;
            });
        }


    }

    _handleKeyDown(e) {
        const code = e.code;
        
        // P1 Movement
        if (this.keyBinds.up.includes(code))    this.dir = { x: 0, y: -1 };
        if (this.keyBinds.down.includes(code))  this.dir = { x: 0, y: 1 };
        if (this.keyBinds.left.includes(code))  this.dir = { x: -1, y: 0 };
        if (this.keyBinds.right.includes(code)) this.dir = { x: 1, y: 0 };

        // Pause
        if (this.keyBinds.pause.includes(code)) {
            this.pausePressed = true; // Will be consumed by Game loop
        }

        // Restart actions
        if (code === 'Space') {
            this.actionPressed = true;
        }

        // P2 Movement (Battle Mode)
        if (this.keyBinds.p2up.includes(code))    this.p2dir = { x: 0, y: -1 };
        if (this.keyBinds.p2down.includes(code))  this.p2dir = { x: 0, y: 1 };
        if (this.keyBinds.p2left.includes(code))  this.p2dir = { x: -1, y: 0 };
        if (this.keyBinds.p2right.includes(code)) this.p2dir = { x: 1, y: 0 };
    }

    _simulateKeyDownObject(code) {
        this._handleKeyDown({ code: code });
    }

    _handleTouchStart(e) {
        if (e.touches.length > 0) {
            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;

            const now = performance.now();
            if (now - this.lastTapTime < 300) {
                this.pausePressed = true;
                this.lastTapTime = 0;
            } else {
                this.lastTapTime = now;
            }
        }
    }

    _handleTouchEnd(e) {
        if (e.changedTouches.length > 0) {
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;

            const dx = touchEndX - this.touchStartX;
            const dy = touchEndY - this.touchStartY;

            // Check if swipe distance exceeds threshold
            if (Math.abs(dx) > this.minSwipeDistance || Math.abs(dy) > this.minSwipeDistance) {
                // Determine dominating axis
                if (Math.abs(dx) > Math.abs(dy)) {
                    // Horizontal swipe
                    this.dir = { x: Math.sign(dx), y: 0 }; // 1 for right, -1 for left
                } else {
                    // Vertical swipe
                    this.dir = { x: 0, y: Math.sign(dy) }; // 1 for down, -1 for up
                }
            }
        }
    }

    /**
     * Consume the pause flag, returning true if it was pressed since last check.
     */
    consumePause() {
        if (this.pausePressed) {
            this.pausePressed = false;
            return true;
        }
        return false;
    }

    consumeAction() {
        if (this.actionPressed) {
            this.actionPressed = false;
            return true;
        }
        return false;
    }
}
