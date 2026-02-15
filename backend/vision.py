import cv2
import requests
import numpy as np
from flask import Flask, request, Response
import threading
import time
from PIL import Image
from ultralytics import YOLO

VISION_SERVER_HOST = '0.0.0.0'
VISION_SERVER_PORT = 5001
BACKEND_URL = "http://localhost:5002/resource_found"

CONFIDENCE_THRESHOLD = 0.5
DETECTION_INTERVAL = 0.5
TARGET_OBJECTS = [
    "bottle", "cup", "person", "chair", "laptop", 
    "cell phone", "book", "clock", "vase", "scissors"
]

latest_frame = None
latest_annotated_frame = None
frame_lock = threading.Lock()
model = None
last_detection_time = 0

def load_yolo_model():
    global model
    print("Loading YOLO26 model...")
    
    try:
        # YOLO26 automatically selects the best device (MPS/CUDA/CPU)
        model = YOLO('yolo26n.pt')  # 'n' = nano version (fast & lightweight)
        model.conf = CONFIDENCE_THRESHOLD
        
        print(f"Model loaded successfully on device: {model.device}")
        print("Model loaded successfully")
        return True
    except Exception as e:
        print(f"Error loading model: {e}")
        return False

app = Flask(__name__)

@app.route('/upload_frame', methods=['POST'])
def upload_frame():
    global latest_frame
    
    try:
        if 'image' not in request.files:
            return {"status": "error", "message": "No image"}, 400
        
        image_bytes = request.files['image'].read()
        nparr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            return {"status": "error", "message": "Invalid image"}, 400
        
        with frame_lock:
            latest_frame = frame
        
        return {"status": "ok"}, 200
    except Exception as e:
        return {"status": "error", "message": str(e)}, 500

@app.route('/health', methods=['GET'])
def health():
    return {"status": "running", "model_loaded": model is not None}, 200

def process_detections(results):
    global latest_annotated_frame
    detected_objects = []
    
    # YOLO26 results format
    for result in results:
        # Store annotated frame for web viewing
        latest_annotated_frame = result.plot()
        
        boxes = result.boxes
        for box in boxes:
            # Get class name and confidence
            cls_id = int(box.cls[0])
            label = result.names[cls_id]
            confidence = float(box.conf[0])
            
            if label in TARGET_OBJECTS and confidence >= CONFIDENCE_THRESHOLD:
                print(f"Detected: {label} ({confidence:.2f})")
                detected_objects.append(label)
                
                try:
                    response = requests.post(BACKEND_URL, json={'label': label}, timeout=1.0)
                    if response.status_code == 200:
                        result_json = response.json()
                        status_icon = "✓" if result_json.get('status') == 'added' else "○"
                        print(f"{status_icon} {label}")
                except requests.exceptions.RequestException as e:
                    print(f"Backend error: {e}")
    
    return detected_objects

def detection_loop():
    global latest_frame, last_detection_time
    
    while True:
        try:
            current_time = time.time()
            
            if current_time - last_detection_time < DETECTION_INTERVAL:
                time.sleep(0.1)
                continue
            
            with frame_lock:
                if latest_frame is None:
                    time.sleep(0.1)
                    continue
                frame = latest_frame.copy()
            
            results = model(frame)
            detected = process_detections(results)
            last_detection_time = current_time
            
        except Exception as e:
            print(f"Detection error: {e}")
            time.sleep(1)

@app.route('/get_frame', methods=['GET'])
def get_frame():
    """Return the latest annotated frame as JPEG"""
    global latest_annotated_frame
    
    if latest_annotated_frame is None:
        # Create placeholder
        placeholder = np.zeros((480, 640, 3), dtype=np.uint8)
        cv2.putText(placeholder, "Waiting for camera...", (150, 240),
                   cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        ret, jpeg = cv2.imencode('.jpg', placeholder)
    else:
        ret, jpeg = cv2.imencode('.jpg', latest_annotated_frame)
    
    if not ret:
        return {"status": "error"}, 500
    
    return Response(jpeg.tobytes(), mimetype='image/jpeg')

def generate_frames():
    """Generator function for MJPEG streaming"""
    global latest_annotated_frame
    
    while True:
        if latest_annotated_frame is None:
            # Create placeholder
            placeholder = np.zeros((480, 640, 3), dtype=np.uint8)
            cv2.putText(placeholder, "Waiting for camera...", (150, 240),
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            ret, jpeg = cv2.imencode('.jpg', placeholder)
        else:
            ret, jpeg = cv2.imencode('.jpg', latest_annotated_frame)
        
        if ret:
            frame_bytes = jpeg.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        
        time.sleep(0.033)  # ~30 FPS

@app.route('/video_feed', methods=['GET'])
def video_feed():
    """Live MJPEG stream endpoint"""
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

def main():
    if not load_yolo_model():
        return
    
    print(f"Starting server on {VISION_SERVER_HOST}:{VISION_SERVER_PORT}")
    print(f"Pi should send to: http://<mac-ip>:{VISION_SERVER_PORT}/upload_frame")
    
    detection_thread = threading.Thread(target=detection_loop, daemon=True)
    detection_thread.start()
    
    print("📷 Camera viewer available at: http://localhost:5001/get_frame")
    print("   Or visit: http://172.20.10.3:5001/get_frame")
    
    try:
        app.run(host=VISION_SERVER_HOST, port=VISION_SERVER_PORT, threaded=True)
    except KeyboardInterrupt:
        print("\nShutting down...")

if __name__ == "__main__":
    main()
