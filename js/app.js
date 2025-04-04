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
            // オリジナルの画像サイズが保存されている場合
            if (this.uploader && this.uploader.imageOriginalWidth && this.uploader.imageOriginalHeight) {
                const originalWidth = this.uploader.imageOriginalWidth;
                const originalHeight = this.uploader.imageOriginalHeight;
                
                // コンテナのサイズを取得
                const containerWidth = this.canvasContainer.clientWidth;
                
                // モバイルかどうかを判定
                const isMobile = window.innerWidth <= 768;
                
                // モバイルの場合は画面幅の80%を使用し、最大高さも調整
                const containerHeight = isMobile 
                    ? Math.min(window.innerHeight * 0.5, 450) 
                    : (this.canvasContainer.clientHeight || window.innerHeight * 0.7);
                
                // アスペクト比を維持しながらコンテナに収まるサイズを計算
                const scale = Math.min(
                    containerWidth / originalWidth,
                    containerHeight / originalHeight
                );
                
                // モバイルの場合はさらに拡大率を調整（小さすぎる場合）
                const adjustedScale = isMobile && scale < 0.5 ? Math.min(scale * 1.5, 1) : scale;
                
                const scaledWidth = originalWidth * adjustedScale;
                const scaledHeight = originalHeight * adjustedScale;
                
                // キャンバスのサイズを更新
                this.canvas.setDimensions({
                    width: scaledWidth,
                    height: scaledHeight
                });
                
                // キャンバス上のすべてのオブジェクトをスケーリング
                const objects = this.canvas.getObjects();
                for (let i = 0; i < objects.length; i++) {
                    const obj = objects[i];
                    if (obj.type === 'image') {
                        obj.scaleToWidth(scaledWidth);
                        obj.set({
                            left: scaledWidth / 2,
                            top: scaledHeight / 2
                        });
                    }
                }
                
                // モバイルの場合、キャンバスコンテナの高さを明示的に設定
                if (isMobile) {
                    this.canvasContainer.style.height = `${scaledHeight}px`;
                }
                
                this.canvas.renderAll();
            } else {
                // 画像がまだロードされていない場合は単純なリサイズを実行
                const originalWidth = this.canvas.getWidth();
                const originalHeight = this.canvas.getHeight();
                const containerWidth = this.canvasContainer.clientWidth;
                
                if (originalWidth > 0) {
                    const scale = containerWidth / originalWidth;
                    const newHeight = originalHeight * scale;
                    
                    this.canvas.setDimensions({
                        width: containerWidth,
                        height: newHeight
                    });
                    
                    this.canvas.renderAll();
                }
            }
        }
    }
    
    resetTool() {
        // リセット前の確認
        if (confirm('現在の作業内容をリセットして、新しい画像を選択しますか？')) {
            // キャンバスを完全にリセット
            if (this.canvas) {
                this.canvas.dispose();
            }
            
            // 新しいキャンバスを作成
            this.initCanvas();
            
            // サブモジュールをリセット
            this.selector.reset();
            this.scaleCalculator.reset();
            
            // 新しいキャンバスに対してイベントリスナーを再設定
            this.selector.setupCanvasEvents();
            
            // UI表示を初期状態に戻す
            this.uploadArea.style.display = 'block';
            document.getElementById('app-container').style.display = 'none';
            document.getElementById('reset-container').style.display = 'none';
            
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
