// ファイルアップロード処理モジュール
class FileUploader {
    constructor(app) {
        this.app = app;
        this.maxImageSize = 10 * 1024 * 1024; // 10MB制限
        this.maxDimension = 2000; // 最大幅・高さ
        
        // イベントリスナー初期化
        this.initEventListeners();
    }
    
    initEventListeners() {
        // ファイル選択クリックイベント
        this.app.uploadArea.addEventListener('click', () => {
            this.app.fileInput.click();
        });
        
        // ドラッグオーバーイベント
        this.app.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.app.uploadArea.classList.add('active');
        });
        
        // ドラッグリーブイベント
        this.app.uploadArea.addEventListener('dragleave', () => {
            this.app.uploadArea.classList.remove('active');
        });
        
        // ドロップイベント
        this.app.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.app.uploadArea.classList.remove('active');
            
            if (e.dataTransfer.files.length) {
                this.handleFile(e.dataTransfer.files[0]);
            }
        });
        
        // ファイル選択イベント
        this.app.fileInput.addEventListener('change', () => {
            if (this.app.fileInput.files.length) {
                this.handleFile(this.app.fileInput.files[0]);
            }
        });
    }
    
    handleFile(file) {
        // ファイルタイプチェック
        if (!file.type.match('image.*')) {
            this.app.showNotification('画像ファイルを選択してください', 'error');
            return;
        }
        
        // ファイルサイズチェック
        if (file.size > this.maxImageSize) {
            this.app.showNotification(`ファイルサイズが大きすぎます (最大: ${this.maxImageSize/1024/1024}MB)`, 'error');
            return;
        }
        
        this.app.showLoading(true);
        
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                // 画像をロード
                const img = new Image();
                img.onload = () => {
                    // 画像の最適化
                    const optimizedImg = this.optimizeImage(img);
                    
                    // キャンバスをリセット
                    this.app.canvas.clear();
                    
                    // 画像をファブリックイメージに変換
                    fabric.Image.fromURL(optimizedImg.src, (fabricImg) => {
                        // 画像のサイズに合わせてキャンバスのサイズを設定
                        this.app.canvas.setWidth(fabricImg.width);
                        this.app.canvas.setHeight(fabricImg.height);
                        
                        // 画像を選択・移動不可に設定
                        fabricImg.selectable = false;
                        fabricImg.evented = false;
                        fabricImg.lockMovementX = true;
                        fabricImg.lockMovementY = true;
                        
                        // 画像を中央に配置
                        fabricImg.set({
                            originX: 'center',
                            originY: 'center',
                            left: fabricImg.width / 2,
                            top: fabricImg.height / 2
                        });
                        
                        // 画像をキャンバスに追加
                        this.app.canvas.add(fabricImg);
                        this.app.canvas.renderAll();
                        
                        // 表示を切り替え
                        this.app.uploadArea.style.display = 'none';
                        document.getElementById('app-container').style.display = 'flex';
                        
                        // リサイズイベントを発火
                        this.app.handleResize();
                        
                        this.app.showLoading(false);
                        this.app.showNotification('画像をロードしました', 'success');
                    });
                };
                
                img.onerror = () => {
                    this.app.showLoading(false);
                    this.app.showNotification('画像の読み込みに失敗しました', 'error');
                };
                
                img.src = e.target.result;
            } catch (error) {
                this.app.showLoading(false);
                this.app.showNotification('画像の処理中にエラーが発生しました', 'error');
                console.error('画像処理エラー:', error);
            }
        };
        
        reader.onerror = () => {
            this.app.showLoading(false);
            this.app.showNotification('ファイルの読み込みに失敗しました', 'error');
        };
        
        reader.readAsDataURL(file);
    }
    
    optimizeImage(img) {
        // 大きすぎる画像を適切なサイズにリサイズ
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        let width = img.width;
        let height = img.height;
        
        // サイズ調整が必要な場合
        if (width > this.maxDimension || height > this.maxDimension) {
            if (width > height) {
                height = height * (this.maxDimension / width);
                width = this.maxDimension;
            } else {
                width = width * (this.maxDimension / height);
                height = this.maxDimension;
            }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // 画像描画
        ctx.drawImage(img, 0, 0, width, height);
        
        // 最適化された画像を返す
        const optimizedImg = new Image();
        optimizedImg.src = canvas.toDataURL('image/jpeg', 0.85);
        
        return optimizedImg;
    }
}
