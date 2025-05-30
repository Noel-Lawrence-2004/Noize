import os
import torch
import torchaudio
import shutil
from demucs import pretrained
from demucs.apply import apply_model
from demucs.audio import save_audio

# Define paths
RESULT_FOLDER = "static/results"
os.makedirs(RESULT_FOLDER, exist_ok=True)

# Load the pre-trained model (only once)
def load_model():
    model = pretrained.get_model('htdemucs_6s')  # Load the 6-stem model
    model = model.models[0]  # Extract the actual model from BagOfModels
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device)
    model.eval()
    return model, device

MODEL, DEVICE = load_model()  # Load once, use everywhere

# Separate audio file into 5 stems
def separate_audio(file_path):
    print(f" Loading file: {file_path}")  # Debug print

    wav, sr = torchaudio.load(file_path)

    if wav.shape[0] == 1:
        wav = torch.cat([wav, wav], dim=0)  # Convert mono to stereo
    wav = wav.to(DEVICE)

    # Ensure correct shape: (batch=1, channels, samples)
    wav = wav.unsqueeze(0)  # Adds batch dimension at the correct position
    

    # Apply Demucs model
    with torch.no_grad():
        sources = apply_model(MODEL, wav, device=DEVICE, shifts=1, split=True, overlap=0.1)
        
    # REMOVE OLD result FOLDER IF IT EXISTS
    if os.path.exists(RESULT_FOLDER):
        print(f"🗑 Removing old separation folder : {RESULT_FOLDER}")
        try:
            shutil.rmtree(RESULT_FOLDER)  # Delete everything inside
            print("✅ Old separation folder deleted!")
        except Exception as e:
            print(f"⚠️ Error deleting folder: {e}")

    output_folder = os.path.join(RESULT_FOLDER, os.path.splitext(os.path.basename(file_path))[0])

    os.makedirs(output_folder, exist_ok=True)

    stem_names = ['drums', 'bass', 'other', 'vocals', 'guitar', 'piano']
    file_paths = {}

    for source, name in zip(sources[0], stem_names):
        source = source.cpu()
        output_path = os.path.join(output_folder, f"{name}.wav")
        save_audio(source, output_path, samplerate=sr)
        file_paths[name] = output_path

    return file_paths
