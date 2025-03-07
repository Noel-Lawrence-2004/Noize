from flask import Flask, render_template, request, jsonify , url_for , send_file
import os
import glob
from process_audio import separate_audio

app = Flask(__name__)

# Configure maximum file size (50MB)
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024
ALLOWED_EXTENSIONS = {'mp3', 'wav', 'ogg', 'm4a'}

UPLOAD_FOLDER = "static/uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload():
    try:
        print(" Upload request received!")
        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400
    
        file = request.files['file']

        if file.filename == '':
            print(" No file selected")
            return jsonify({'error': 'No selected file'}), 400   
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed'}), 400
        
        if file:
            file_path = os.path.join(UPLOAD_FOLDER, file.filename)
            print("🗑 Removing old audio files...")
            for old_file in glob.glob(os.path.join(UPLOAD_FOLDER, "*")):
                try:
                    os.remove(old_file)
                    print(f"   ✅ Deleted: {old_file}")
                except Exception as e:
                    print(f"   ⚠️ Error deleting {old_file}: {e}")



            file.save(file_path)
            print(f" File saved: {file_path}")

            result_files = separate_audio(file_path)  # Use the imported function
            print(" Processing complete!")
            print("📝 Debugging: Stems generated ->", result_files)

            return jsonify({
                "message": "Processing complete",
                "original_audio": url_for('static', filename=f"uploads/{file.filename}"),
                "stems": {stem: path.replace("\\", "/") for stem, path in result_files.items()}
            })

    except Exception as e:
        print(f" Error during processing: {e}")
        return jsonify({'error': str(e)}), 500
    
# Add this to handle large files properly
@app.before_request
def handle_chunking():
    if request.method == 'POST':
        if 'Transfer-Encoding' in request.headers:
            if 'chunked' in request.headers['Transfer-Encoding']:
                # Handle chunked encoding
                pass

if __name__ == '__main__':
    app.run(debug=True)
