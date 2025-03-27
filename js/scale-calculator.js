// スケール計算モジュール
class ScaleCalculator {
    constructor(app) {
        this.app = app;
        
        // スケール情報
        this.scale = {
            pixelsPerMeter: 0,
            calculatedFrom: null
        };
        
        // 帖のサイズ定義 (m²)
        this.joSizes = {
            'standard': 1.62  // 標準的な帖のサイズ (1.8m x 0.9m)
        };
        
        // グリッド移動用の変数
        this.isDraggingGrid = false;
        this.gridOffset = { x: 0, y: 0 };
        this.dragStartX = 0;
        this.dragStartY = 0;
        
        // グリッド表示状態
        this.isGridVisible = true;
        
        // グリッドレイヤー参照
        this.gridLayer = document.getElementById('grid-layer');
    }
    
    reset() {
        this.scale = {
            pixelsPerMeter: 0,
            calculatedFrom: null
        };
        this.gridOffset = { x: 0, y: 0 };
        this.isGridVisible = true;
        
        // グリッドをクリア
        if (this.gridLayer) {
            this.gridLayer.innerHTML = '';
            this.gridLayer.style.pointerEvents = 'none'; // 選択可能にするため
            this.gridLayer.style.visibility = 'visible'; // 初期状態は表示
        }
        
        // グリッド操作説明を非表示
        document.getElementById('ruler-controls').style.display = 'none';
    }
    
    isScaleSet() {
        return this.scale.calculatedFrom !== null;
    }
    
    calculateScale() {
        const areaInput = parseFloat(document.getElementById('area-input').value);
        const selectedAreaUnit = document.getElementById('area-unit').value;
        
        if (isNaN(areaInput) || areaInput <= 0) {
            this.app.showNotification('有効な面積を入力してください', 'error');
            return;
        }
        
        const selectedPoints = this.app.selector.getSelectedPoints();
        
        if (selectedPoints.length < 3 || !this.app.selector.isPolygonCompleted()) {
            this.app.showNotification('多角形による範囲選択を先に行い、閉じてください', 'error');
            return;
        }
        
        // 多角形の面積を計算
        const pixelArea = this.app.selector.calculatePolygonArea(selectedPoints);
        
        // 単位に応じた実際の面積を計算
        let realArea;
        if (selectedAreaUnit === 'jo') {
            realArea = areaInput * this.joSizes.standard;
        } else {
            realArea = areaInput; // m²
        }
        
        // スケールを計算 (ピクセル/メートル)
        // √(pixelArea/realArea)を計算して線形スケール係数を求める
        this.scale.pixelsPerMeter = Math.sqrt(pixelArea / realArea);
        
        this.scale.calculatedFrom = {
            area: areaInput,
            areaUnit: selectedAreaUnit
        };
        
        // 1mグリッドを表示
        this.drawGrid();
        
        // グリッド操作の説明を表示
        document.getElementById('ruler-controls').style.display = 'block';
        
        // 表示切替ボタンのイベントリスナーを設定
        document.getElementById('toggle-grid-btn').addEventListener('click', () => this.toggleGridVisibility());
        
        // 成功メッセージを表示
        const scaleInfoDiv = document.createElement('div');
        scaleInfoDiv.className = 'success-message';
        scaleInfoDiv.innerHTML = `
            <div style="background-color: #d4edda; color: #155724; padding: 15px; 
                        border-radius: 5px; margin-top: 15px; text-align: center;">
                <p style="font-size: 16px; font-weight: bold; margin: 0;">スケール計算完了!</p>
                <p style="margin: 10px 0 0;">1メートル = ${this.scale.pixelsPerMeter.toFixed(2)}ピクセル</p>
            </div>
        `;
        
        // 既存のメッセージを削除
        const existingMsg = document.querySelector('.success-message');
        if (existingMsg) {
            existingMsg.remove();
        }
        
        // メッセージを追加
        this.app.controlPanel.appendChild(scaleInfoDiv);
        
        // グリッドレイヤーを操作可能にする
        this.gridLayer.style.pointerEvents = 'auto';
        
        this.app.showNotification('スケール計算が完了しました', 'success');
    }
    
    // グリッドの表示/非表示を切り替え
    toggleGridVisibility() {
        this.isGridVisible = !this.isGridVisible;
        
        if (this.isGridVisible) {
            this.gridLayer.style.visibility = 'visible';
            document.getElementById('toggle-grid-btn').textContent = 'グリッド表示を隠す';
            this.app.showNotification('グリッドを表示しました', 'info');
        } else {
            this.gridLayer.style.visibility = 'hidden';
            document.getElementById('toggle-grid-btn').textContent = 'グリッドを表示';
            this.app.showNotification('グリッドを非表示にしました', 'info');
        }
    }
    
    drawGrid() {
        // グリッドレイヤーのリファレンスを取得
        this.gridLayer = document.getElementById('grid-layer');
        this.gridLayer.innerHTML = '';
        
        const canvasWidth = this.app.canvas.getWidth();
        const canvasHeight = this.app.canvas.getHeight();
        
        // グリッドレイヤーのサイズをキャンバスに合わせる
        this.gridLayer.style.width = `${canvasWidth}px`;
        this.gridLayer.style.height = `${canvasHeight}px`;
        
        // グリッドの範囲を計算（余裕を持たせる）
        const numHorizontalLines = Math.ceil(canvasHeight / this.scale.pixelsPerMeter) + 10;
        const numVerticalLines = Math.ceil(canvasWidth / this.scale.pixelsPerMeter) + 10;
        
        // 水平線を描画
        for (let i = 0; i < numHorizontalLines; i++) {
            const line = document.createElement('div');
            line.className = 'grid-line-h';
            line.style.top = `${i * this.scale.pixelsPerMeter}px`;
            this.gridLayer.appendChild(line);
        }
        
        // 垂直線を描画
        for (let i = 0; i < numVerticalLines; i++) {
            const line = document.createElement('div');
            line.className = 'grid-line-v';
            line.style.left = `${i * this.scale.pixelsPerMeter}px`;
            this.gridLayer.appendChild(line);
        }
        
        // ドラッグ機能を設定
        this.setupGridDrag();
    }
    
    setupGridDrag() {
        // レイヤー全体をドラッグ可能にする
        this.gridLayer.style.cursor = 'move';
        
        // マウスダウン時のイベント
        this.gridLayer.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.isDraggingGrid = true;
            this.dragStartX = e.clientX;
            this.dragStartY = e.clientY;
            
            // 初期オフセットを保存
            this.initialOffset = { 
                x: this.gridOffset.x, 
                y: this.gridOffset.y 
            };
            
            // マウス移動イベントを追加
            document.addEventListener('mousemove', this.handleGridDrag);
            
            // マウスアップイベントを追加
            document.addEventListener('mouseup', this.handleGridDragEnd);
        });
        
        // タッチデバイス用イベント
        this.gridLayer.addEventListener('touchstart', (e) => {
            if (e.touches.length !== 1) return;
            
            e.preventDefault();
            this.isDraggingGrid = true;
            this.dragStartX = e.touches[0].clientX;
            this.dragStartY = e.touches[0].clientY;
            
            // 初期オフセットを保存
            this.initialOffset = { 
                x: this.gridOffset.x, 
                y: this.gridOffset.y 
            };
            
            // タッチ移動イベントを追加
            document.addEventListener('touchmove', this.handleGridTouchDrag);
            
            // タッチエンドイベントを追加
            document.addEventListener('touchend', this.handleGridDragEnd);
        });
    }
    
    // グリッドドラッグ中のイベントハンドラ (マウス)
    handleGridDrag = (e) => {
        if (!this.isDraggingGrid) return;
        
        e.preventDefault();
        
        const dx = e.clientX - this.dragStartX;
        const dy = e.clientY - this.dragStartY;
        
        this.moveGrid(dx, dy);
    }
    
    // グリッドドラッグ中のイベントハンドラ (タッチ)
    handleGridTouchDrag = (e) => {
        if (!this.isDraggingGrid || e.touches.length !== 1) return;
        
        e.preventDefault();
        
        const dx = e.touches[0].clientX - this.dragStartX;
        const dy = e.touches[0].clientY - this.dragStartY;
        
        this.moveGrid(dx, dy);
    }
    
    // グリッドを移動
    moveGrid(dx, dy) {
        // 新しいオフセットを計算
        this.gridOffset.x = this.initialOffset.x + dx;
        this.gridOffset.y = this.initialOffset.y + dy;
        
        // グリッドレイヤーの位置を更新
        this.updateGridPosition();
    }
    
    // グリッドの位置を更新
    updateGridPosition() {
        // 水平線の位置を更新
        const horizontalLines = this.gridLayer.querySelectorAll('.grid-line-h');
        horizontalLines.forEach((line, index) => {
            const originalTop = index * this.scale.pixelsPerMeter;
            line.style.top = `${originalTop + this.gridOffset.y}px`;
        });
        
        // 垂直線の位置を更新
        const verticalLines = this.gridLayer.querySelectorAll('.grid-line-v');
        verticalLines.forEach((line, index) => {
            const originalLeft = index * this.scale.pixelsPerMeter;
            line.style.left = `${originalLeft + this.gridOffset.x}px`;
        });
    }
    
    // グリッドドラッグ終了時のイベントハンドラ
    handleGridDragEnd = (e) => {
        if (!this.isDraggingGrid) return;
        
        // ドラッグ終了
        this.isDraggingGrid = false;
        
        // イベントリスナーを削除
        document.removeEventListener('mousemove', this.handleGridDrag);
        document.removeEventListener('touchmove', this.handleGridTouchDrag);
        document.removeEventListener('mouseup', this.handleGridDragEnd);
        document.removeEventListener('touchend', this.handleGridDragEnd);
    }
    
    // ドラッグをキャンセル（ESCキー用）
    cancelGridDrag() {
        if (!this.isDraggingGrid) return;
        
        // 元の位置に戻す
        this.gridOffset = this.initialOffset;
        this.updateGridPosition();
        
        // ドラッグ終了
        this.handleGridDragEnd();
        
        this.app.showNotification('グリッド移動をキャンセルしました', 'info');
    }
}
