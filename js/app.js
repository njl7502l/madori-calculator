// メインアプリケーションクラス
class FloorPlanScaleTool {
    constructor() {
        // DOM要素
        this.uploadArea = document.getElementById('upload-area');
        this.fileInput = document.getElementById('file-input');
        this.canvasContainer = document.getElementById('canvas-container');
        this.controlPanel = document.getElementById('control-panel');
        this.calculateBtn = document.getElementById('calculate-btn');
        this.resetBtn = document.getElementById('reset-btn');
        this.clearSelectionBtn = document.getElementById('clear-selection-btn');
        this.finishPolygonBtn = document.getElementById('finish-polygon-btn');
        this.loadingIndicator = document.getElementById('loading');
        
        // キャンバス初期化
        this.canvas = null;
        this.initCanvas();
        
        // サブモジュール初期化
        this.uploader = new FileUploader(this);
        this.selector = new PolygonSelector(this);
        this.scaleCalculator = new ScaleCalculator(this);
        
        // イベントリスナー設定
        this.setupEventListeners();
    }
    
    initCanvas() {
        this.canvas = new fabric.Canvas('floor-plan-canvas', {
            selection: true,
            preserveObjectStacking: true
        });
        
        // タッチデバイス対応
        this.canvas.allowTouchScrolling = true;
    }
    
    setupEventListeners() {
        // リセットボタン
        this.resetBtn.addEventListener('click', () => this.resetTool());
        
        // 計算ボタン
        this.calculateBtn.addEventListener('click', () => this.scaleCalculator.calculateScale());
        
        // ウィンドウリサイズ
        window.addEventListener('resize', () => this.handleResize());
        
        // キーボードアクセシビリティ
        this.uploadArea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.fileInput.click();
            }
        });
    }
    
    handleResize() {
        if (this.canvas && this.canvasContainer.clientWidth > 0) {
            const originalWidth = this.canvas.getWidth();
            const originalHeight = this.canvas.getHeight();
            const containerWidth = this.canvasContainer.clientWidth;
            
            const scale = containerWidth / originalWidth;
            const newHeight = originalHeight * scale;
            
            this.canvas.setDimensions({
                width: containerWidth,
                height: newHeight
            });
            
            this.canvas.renderAll();
        }
    }
    
    resetTool() {
        // リセット前の確認
        if (confirm('現在の作業内容をリセットしますか？')) {
            // キャンバスを完全にリセット
            if (this.canvas) {
                this.canvas.dispose();
            }
            
            // 新しいキャンバスを作成
            this.initCanvas();
            
            // サブモジュールをリセット
            this.selector.reset();
            this.scaleCalculator.reset();
            
            // UI表示を初期状態に戻す
            this.uploadArea.style.display = 'block';
            document.getElementById('app-container').style.display = 'none';
            
            // グリッドレイヤーをリセット
            const gridLayer = document.getElementById('grid-layer');
            gridLayer.innerHTML = '';
            gridLayer.style.pointerEvents = 'none';
            
            // 入力をリセット
            document.getElementById('area-input').value = '';
            document.getElementById('area-unit').selectedIndex = 0;
            
            // ファイル入力もリセット
            this.fileInput.value = '';
            
            // 通知
            this.showNotification('ツールをリセットしました', 'info');
        }
    }
    
    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = 'notification ' + type + ' show';
        
        setTimeout(() => {
            notification.className = 'notification ' + type;
        }, duration);
    }
    
    showLoading(show = true) {
        this.loadingIndicator.style.display = show ? 'block' : 'none';
    }
}

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', function() {
    const app = new FloorPlanScaleTool();
});
