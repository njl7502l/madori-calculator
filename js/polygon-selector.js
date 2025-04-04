// 多角形選択モジュール
class PolygonSelector {
    constructor(app) {
        this.app = app;
        
        // 選択中の領域（複数ポイント対応）
        this.selectedPoints = [];
        this.isDrawing = false;
        this.tempLine = null;
        this.polygonCompleted = false;
        
        // 頂点ドラッグ用の変数
        this.vertexHandles = [];
        this.activeVertex = null;
        
        // イベントリスナー初期化
        this.initEventListeners();
    }
    
    initEventListeners() {
        // クリアボタン
        this.app.clearSelectionBtn.addEventListener('click', () => this.clearSelection());
        
        // キャンバスイベント
        this.setupCanvasEvents();
    }
    
    setupCanvasEvents() {
        // イベントリスナーが既に登録されている場合は重複登録を防ぐために削除
        this.app.canvas.off('mouse:down');
        this.app.canvas.off('mouse:move');
        this.app.canvas.off('touch:longpress');
        this.app.canvas.off('touch:tap');
        this.app.canvas.off('touch:move');
        this.app.canvas.off('object:moving');
        this.app.canvas.off('object:modified');
        
        // マウスダウンイベント（クリック）
        this.app.canvas.on('mouse:down', (options) => {
            if (this.app.scaleCalculator.isScaleSet() || this.polygonCompleted) return;
            
            const pointer = options.pointer;
            
            // 最初の点の近くをクリックで多角形を閉じる
            if (this.selectedPoints.length > 2 && 
                Math.abs(pointer.x - this.selectedPoints[0].x) < 20 && 
                Math.abs(pointer.y - this.selectedPoints[0].y) < 20) {
                
                this.finishPolygon();
                return;
            }
            
            // 多角形が3点以上あり、最初の点に近くない場合は通常の点として追加
            
            this.selectedPoints.push({x: pointer.x, y: pointer.y});
            this.drawPolygonLines();
            
            // 最初の点をハイライト表示
            if (this.selectedPoints.length === 1) {
                this.highlightFirstPoint();
            }
        });
        
        // マウス移動イベント
        this.app.canvas.on('mouse:move', (options) => {
            if (this.app.scaleCalculator.isScaleSet() || this.polygonCompleted) return;
            
            const pointer = options.pointer;
            
            if (this.selectedPoints.length > 0) {
                // 多角形の一時的な線を更新
                this.updateTempPolygonLine(pointer);
                
                // 最初の点の近くにマウスがあるかチェック
                if (this.selectedPoints.length > 2 && 
                    Math.abs(pointer.x - this.selectedPoints[0].x) < 20 && 
                    Math.abs(pointer.y - this.selectedPoints[0].y) < 20) {
                    this.highlightClosablePoint();
                } else {
                    this.removeClosableHighlight();
                }
            }
        });
        
        this.app.canvas.on('touch:longpress', (options) => {
            if (this.app.scaleCalculator.isScaleSet() || this.polygonCompleted) return;
            
            const pointer = options.pointer;
            
            // 最初の点の近くをタップで多角形を閉じる
            if (this.selectedPoints.length > 2 && 
                Math.abs(pointer.x - this.selectedPoints[0].x) < 30 && 
                Math.abs(pointer.y - this.selectedPoints[0].y) < 30) {
                
                this.finishPolygon();
                return;
            }
            
            this.selectedPoints.push({x: pointer.x, y: pointer.y});
            this.drawPolygonLines();
            
            // 最初の点をハイライト表示
            if (this.selectedPoints.length === 1) {
                this.highlightFirstPoint();
            }
        });
        
        // 通常のタップイベントもサポート
        this.app.canvas.on('touch:tap', (options) => {
            // longpressが動作しない場合のフォールバック
            if (this.app.scaleCalculator.isScaleSet() || this.polygonCompleted) return;
            
            // タップ位置を取得
            const pointer = options.pointer;
            
            // 最初の点の近くをタップで多角形を閉じる
            if (this.selectedPoints.length > 2 && 
                Math.abs(pointer.x - this.selectedPoints[0].x) < 30 && 
                Math.abs(pointer.y - this.selectedPoints[0].y) < 30) {
                
                this.finishPolygon();
                return;
            }
            
            this.selectedPoints.push({x: pointer.x, y: pointer.y});
            this.drawPolygonLines();
            
            // 最初の点をハイライト表示
            if (this.selectedPoints.length === 1) {
                this.highlightFirstPoint();
            }
        });
        
        // タッチ移動イベント
        this.app.canvas.on('touch:move', (options) => {
            if (this.app.scaleCalculator.isScaleSet() || this.polygonCompleted) return;
            
            const pointer = options.pointer;
            
            if (this.selectedPoints.length > 0) {
                // 多角形の一時的な線を更新
                this.updateTempPolygonLine(pointer);
                
                // 最初の点の近くにタッチポイントがあるかチェック
                if (this.selectedPoints.length > 2 && 
                    Math.abs(pointer.x - this.selectedPoints[0].x) < 30 && 
                    Math.abs(pointer.y - this.selectedPoints[0].y) < 30) {
                    this.highlightClosablePoint();
                } else {
                    this.removeClosableHighlight();
                }
            }
        });
        
        // オブジェクト移動イベント（頂点ドラッグ用）
        this.app.canvas.on('object:moving', (options) => {
            const movedObject = options.target;
            
            // 頂点ハンドルの移動イベント
            if (movedObject && movedObject.vertexIndex !== undefined) {
                const index = movedObject.vertexIndex;
                
                // 頂点の位置を更新
                this.selectedPoints[index].x = movedObject.left + movedObject.radius;
                this.selectedPoints[index].y = movedObject.top + movedObject.radius;
                
                // 多角形と線を更新
                this.updatePolygonAfterDrag();
            }
        });
        
        // 移動後のイベント
        this.app.canvas.on('object:modified', (options) => {
            const modifiedObject = options.target;
            
            // 頂点ハンドルの修正完了イベント
            if (modifiedObject && modifiedObject.vertexIndex !== undefined) {
                // 多角形と線を更新
                this.updatePolygonAfterDrag();
                
                // 面積再計算して表示
                if (this.polygonCompleted) {
                    this.updateAreaText();
                }
                
                // スケール情報をリセット
                this.resetScaleInfo();
                
                // 方眼グリッド操作を非表示
                document.getElementById('ruler-controls').style.display = 'none';
                
                // 通知を表示
                this.app.showNotification('頂点を移動したため、スケール情報がリセットされました。再計算してください。', 'info');
            }
        });
    }
    
    reset() {
        this.selectedPoints = [];
        this.isDrawing = false;
        this.tempLine = null;
        this.polygonCompleted = false;
        this.vertexHandles = [];
        this.activeVertex = null;
    }
    
    clearSelection() {
        // 選択に関連するすべての要素を削除
        this.app.canvas.getObjects().forEach(obj => {
            if (obj.id && (
                obj.id.startsWith('selection-') || 
                obj.id === 'polygon' ||
                obj.id === 'first-point-highlight' ||
                obj.id === 'closable-highlight' ||
                obj.id === 'completed-polygon' ||
                obj.id === 'completion-message' ||
                obj.id === 'selection-polygon-area' ||
                obj.vertexIndex !== undefined
            )) {
                this.app.canvas.remove(obj);
            }
        });
        
        // 選択状態をリセット
        this.selectedPoints = [];
        this.isDrawing = false;
        this.tempLine = null;
        this.polygonCompleted = false;
        this.vertexHandles = [];
        this.activeVertex = null;
        
        // スケール計算結果もリセット
        this.app.scaleCalculator.reset();
        
        // グリッド操作コントロールを非表示
        document.getElementById('ruler-controls').style.display = 'none';
        
        // グリッドレイヤーをクリア
        const gridLayer = document.getElementById('grid-layer');
        gridLayer.innerHTML = '';
        gridLayer.style.pointerEvents = 'none';
        
        // 成功メッセージを削除
        const existingMsg = document.querySelector('.success-message');
        if (existingMsg) {
            existingMsg.remove();
        }
        
        this.app.canvas.renderAll();
        this.app.showNotification('選択をクリアしました。新しい選択を始めてください。', 'info');
    }
    
    drawPolygonLines() {
        // 既存の多角形線を削除
        this.app.canvas.getObjects().forEach(obj => {
            if (obj.id && obj.id.startsWith('selection-polygon')) {
                this.app.canvas.remove(obj);
            }
        });
        
        // 点を結ぶ線を描画
        for (let i = 0; i < this.selectedPoints.length - 1; i++) {
            const line = new fabric.Line(
                [this.selectedPoints[i].x, this.selectedPoints[i].y, 
                 this.selectedPoints[i+1].x, this.selectedPoints[i+1].y],
                {
                    stroke: 'red',
                    strokeWidth: 2,
                    selectable: false,
                    id: `selection-polygon-${i}`,
                    evented: false // イベントを無効化（描画の安定性向上）
                }
            );
            this.app.canvas.add(line);
        }
        
        // 頂点を描画
        this.selectedPoints.forEach((point, index) => {
            const circle = new fabric.Circle({
                left: point.x - 4,
                top: point.y - 4,
                radius: 4,
                fill: 'red',
                selectable: false,
                id: `selection-polygon-point-${index}`
            });
            this.app.canvas.add(circle);
        });
        
        this.app.canvas.renderAll();
    }
    
    updateTempPolygonLine(pointer) {
        // 一時的な線を更新
        this.app.canvas.getObjects().forEach(obj => {
            if (obj.id === 'selection-polygon-temp') {
                this.app.canvas.remove(obj);
            }
        });
        
        if (this.selectedPoints.length > 0) {
            const lastPoint = this.selectedPoints[this.selectedPoints.length - 1];
            const tempLine = new fabric.Line(
                [lastPoint.x, lastPoint.y, pointer.x, pointer.y],
                {
                    stroke: 'red',
                    strokeWidth: 2,
                    strokeDashArray: [5, 5],
                    selectable: false,
                    id: 'selection-polygon-temp'
                }
            );
            
            this.app.canvas.add(tempLine);
            this.app.canvas.renderAll();
        }
    }
    
    finishPolygon() {
        // 一時的な線やハイライトを削除
        this.app.canvas.getObjects().forEach(obj => {
            if (obj.id === 'selection-polygon-temp' || 
                obj.id === 'closable-highlight') {
                this.app.canvas.remove(obj);
            }
        });
        
        // 最後の点から最初の点へ線を引く
        if (this.selectedPoints.length > 2) {
            const line = new fabric.Line(
                [this.selectedPoints[this.selectedPoints.length - 1].x, this.selectedPoints[this.selectedPoints.length - 1].y, 
                 this.selectedPoints[0].x, this.selectedPoints[0].y],
                {
                    stroke: 'red',
                    strokeWidth: 2,
                    selectable: false,
                    id: `selection-polygon-${this.selectedPoints.length - 1}`
                }
            );
            this.app.canvas.add(line);
            
            // 完成した多角形を塗りつぶして表示
            const polygonPoints = [];
            this.selectedPoints.forEach(point => {
                polygonPoints.push({x: point.x, y: point.y});
            });
            
            const polygon = new fabric.Polygon(polygonPoints, {
                fill: 'rgba(255, 0, 0, 0.2)',
                stroke: 'red',
                strokeWidth: 2,
                selectable: false,
                id: 'completed-polygon',
            });
            
            // 多角形を一番下に配置（画像の上に表示）
            this.app.canvas.insertAt(polygon, 1);
            
            // 多角形の面積を計算して表示
            const area = this.calculatePolygonArea(this.selectedPoints);
            const centroid = this.calculatePolygonCentroid(this.selectedPoints);
            const areaText = new fabric.Text(
                `選択範囲の面積: ${area.toFixed(0)}px²`, 
                {
                    left: centroid.x,
                    top: centroid.y + 10,
                    fontSize: 14,
                    fill: 'black',
                    backgroundColor: 'rgba(255, 255, 255, 0.7)',
                    padding: 5,
                    selectable: false,
                    id: 'selection-polygon-area',
                    originX: 'center'
                }
            );
            this.app.canvas.add(areaText);
            
            // ドラッグ可能な頂点ハンドルを作成
            this.createDraggableVertexHandles();
        }
        
        this.app.canvas.renderAll();
        
        // 選択完了フラグを設定
        this.isDrawing = false;
        this.polygonCompleted = true;
        
        this.app.showNotification('多角形選択が完了しました。頂点をドラッグして位置を調整できます。', 'success');
    }
    
    // ドラッグ可能な頂点ハンドルを作成
    createDraggableVertexHandles() {
        // すべての頂点を削除
        this.app.canvas.getObjects().forEach(obj => {
            if (obj.id && obj.id.startsWith('selection-polygon-point-')) {
                this.app.canvas.remove(obj);
            }
        });
        
        // 頂点ハンドル配列をクリア
        this.vertexHandles = [];
        
        // デバイスタイプに基づいてハンドルサイズを調整
        const isMobile = window.innerWidth <= 768;
        const handleRadius = isMobile ? 8 : 6;
        
        // 各頂点にドラッグ可能なハンドルを作成
        this.selectedPoints.forEach((point, index) => {
            const vertexHandle = new fabric.Circle({
                left: point.x - handleRadius,
                top: point.y - handleRadius,
                radius: handleRadius,
                fill: 'rgba(255, 0, 0, 0.7)',
                stroke: 'white',
                strokeWidth: 1,
                selectable: true,
                hasBorders: false,
                hasControls: false,
                hoverCursor: 'move',
                vertexIndex: index,
                id: `vertex-handle-${index}`
            });
            
            this.app.canvas.add(vertexHandle);
            this.vertexHandles.push(vertexHandle);
        });
        
        this.app.canvas.renderAll();
    }
    
    // スケール情報をリセット
    resetScaleInfo() {
        // スケール計算結果をリセット
        this.app.scaleCalculator.reset();
        
        // グリッドレイヤーをクリア
        const gridLayer = document.getElementById('grid-layer');
        gridLayer.innerHTML = '';
        gridLayer.style.pointerEvents = 'none';
        
        // 成功メッセージを削除（スケール計算結果の表示）
        const existingMsg = document.querySelector('.success-message');
        if (existingMsg) {
            existingMsg.remove();
        }
    }
    
    // ドラッグ後の多角形と線を更新
    updatePolygonAfterDrag() {
        // 既存の多角形と線を削除
        this.app.canvas.getObjects().forEach(obj => {
            if (obj.id === 'completed-polygon' || 
                (obj.id && obj.id.startsWith('selection-polygon-'))) {
                this.app.canvas.remove(obj);
            }
        });
        
        // 新しい多角形を作成
        const polygonPoints = [];
        this.selectedPoints.forEach(point => {
            polygonPoints.push({x: point.x, y: point.y});
        });
        
        const polygon = new fabric.Polygon(polygonPoints, {
            fill: 'rgba(255, 0, 0, 0.2)',
            stroke: 'red',
            strokeWidth: 2,
            selectable: false,
            id: 'completed-polygon',
        });
        
        // 多角形を一番下に配置（画像の上に表示）
        this.app.canvas.insertAt(polygon, 1);
        
        // 各点を結ぶ線を再描画
        const n = this.selectedPoints.length;
        for (let i = 0; i < n; i++) {
            const nextIndex = (i + 1) % n;
            const line = new fabric.Line(
                [this.selectedPoints[i].x, this.selectedPoints[i].y, 
                 this.selectedPoints[nextIndex].x, this.selectedPoints[nextIndex].y],
                {
                    stroke: 'red',
                    strokeWidth: 2,
                    selectable: false,
                    id: `selection-polygon-${i}`,
                    evented: false
                }
            );
            this.app.canvas.add(line);
        }
        
        this.app.canvas.renderAll();
    }
    
    // 面積テキストを更新
    updateAreaText() {
        // 既存の面積テキストを削除
        this.app.canvas.getObjects().forEach(obj => {
            if (obj.id === 'selection-polygon-area') {
                this.app.canvas.remove(obj);
            }
        });
        
        // 面積を再計算
        const area = this.calculatePolygonArea(this.selectedPoints);
        const centroid = this.calculatePolygonCentroid(this.selectedPoints);
        
        // 新しい面積テキストを追加
        const areaText = new fabric.Text(
            `選択範囲の面積: ${area.toFixed(0)}px²`, 
            {
                left: centroid.x,
                top: centroid.y + 10,
                fontSize: 14,
                fill: 'black',
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                padding: 5,
                selectable: false,
                id: 'selection-polygon-area',
                originX: 'center'
            }
        );
        this.app.canvas.add(areaText);
        this.app.canvas.renderAll();
    }
    
    calculatePolygonArea(points) {
        let area = 0;
        const n = points.length;
        
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            area += points[i].x * points[j].y;
            area -= points[j].x * points[i].y;
        }
        
        return Math.abs(area / 2);
    }
    
    calculatePolygonCentroid(points) {
        let area = 0;
        let cx = 0;
        let cy = 0;
        const n = points.length;
        
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            const f = points[i].x * points[j].y - points[j].x * points[i].y;
            cx += (points[i].x + points[j].x) * f;
            cy += (points[i].y + points[j].y) * f;
            area += f;
        }
        
        area /= 2;
        cx /= (6 * area);
        cy /= (6 * area);
        
        return { x: Math.abs(cx), y: Math.abs(cy) };
    }
    
    highlightFirstPoint() {
        const point = this.selectedPoints[0];
        const isMobile = window.innerWidth <= 768;
        const radius = isMobile ? 12 : 8; // モバイルの場合はより大きなサイズに
        
        const firstPointHighlight = new fabric.Circle({
            left: point.x - radius,
            top: point.y - radius,
            radius: radius,
            fill: 'rgba(0, 255, 0, 0.5)',
            stroke: 'green',
            strokeWidth: isMobile ? 3 : 2, // モバイルの場合は線を太く
            selectable: false,
            id: 'first-point-highlight'
        });
        this.app.canvas.add(firstPointHighlight);
        this.app.canvas.renderAll();
    }
    
    highlightClosablePoint() {
        this.removeClosableHighlight();
    
        const point = this.selectedPoints[0];
        const isMobile = window.innerWidth <= 768;
        const radius = isMobile ? 18 : 12; // モバイルの場合はより大きなサイズに
        
        const closableHighlight = new fabric.Circle({
            left: point.x - radius,
            top: point.y - radius,
            radius: radius,
            fill: 'rgba(255, 255, 0, 0.5)',
            stroke: 'orange',
            strokeWidth: isMobile ? 4 : 3, // モバイルの場合は線を太く
            selectable: false,
            id: 'closable-highlight'
        });
        this.app.canvas.add(closableHighlight);
        this.app.canvas.bringToFront(closableHighlight);
        this.app.canvas.renderAll();
    }
    
    removeClosableHighlight() {
        this.app.canvas.getObjects().forEach(obj => {
            if (obj.id === 'closable-highlight') {
                this.app.canvas.remove(obj);
            }
        });
        this.app.canvas.renderAll();
    }
    
    getSelectedPoints() {
        return this.selectedPoints;
    }
    
    isPolygonCompleted() {
        return this.polygonCompleted;
    }
}
