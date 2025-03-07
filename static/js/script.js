let source;
let audio;
let animationId; // For tracking the animation frame


let mainWavesurfer; // Global definition for accessibility
let stemPlayers = {}; // Store all stem players


console.log("✅ JS file loaded and running!");


document.getElementById('uploadForm').addEventListener('submit', function (e) 
{
        e.preventDefault();
        console.log("Upload started");

        async function handleUpload()
        {
            const formData = new FormData();
            let fileInput = document.getElementById('audioFile');
            let mainContent = document.getElementById('main-content');
            let loadingScreen = document.getElementById('loadingScreen');


            if (!fileInput.files.length) {
                alert("Please select a file.");
                return;
            }

            const file = fileInput.files[0];
            // Add file size check
            if (file.size > 50 * 1024 * 1024) { // 50MB limit
                alert("File is too large. Please select a file under 50MB.");
                return;
            }

            formData.append('file', file);
            console.log("File selected:", file.name);

            // Hide Upload Section and Show Loader
            loadingScreen.classList.remove('hidden');

            try {
                const response = await fetch("/upload", {
                    method: "POST",
                    body: formData,
                    signal: AbortSignal.timeout(60000)

                });

                if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                const result = await response.json();

                console.log("🔍 Server Response:", result); // Debugging
                
                if (!result || !result.stems || typeof result.stems !== "object") {
                    throw new Error("Invalid response: stems data missing or incorrect format. OR U MESSED UP THE RESULT SECTION ");
                }
                
                // Hide loader & Show waveform UI
                mainContent.innerHTML = ''; // Clears the screen
                loadingScreen.classList.add("hidden");
                document.getElementById("waveformContainer").classList.remove("hidden");

                // Load audio Visualization
                let mainAudioPath = result.original_audio;
                let stems = result.stems;
                loadMainAudio(mainAudioPath);
                loadStems(stems);

            } catch (error) {
                console.error("Upload failed:", error);
                loadingScreen.classList.add("hidden");
                alert(`Upload failed: ${error.message}.`);
                    }   
        }

        handleUpload();
    

    });

    document.addEventListener("DOMContentLoaded", function () {
        console.log("✅ DOM fully loaded!");
        let mainWavesurfer = WaveSurfer.create({
            container: "#waveform",
            waveColor: "white",
            progressColor: "blue",
            cursorColor: "red",
            backend: "MediaElement",
            barWidth: 2,
            responsive: true,
            interact: true,// Allow seeking
        });
    

        const downloadButtons = document.querySelectorAll(".download-btn");

        downloadButtons.forEach(button => {
            button.addEventListener("click", function () {
                const stemName = this.getAttribute("data-stem");
    
                // Assuming each stem file is stored as {stemName}.wav
                const filePath = `path/to/stems/${stemName}.wav`;
    
                const link = document.createElement("a");
                link.href = filePath;
                link.download = `${stemName}.wav`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });
        });
    
        // Load the main (muted) audio file
        window.loadMainAudio = function (audioURL) {
            if (!mainWavesurfer) {
                console.error("mainWavesurfer is not initialized!");
                return;
            }
            mainWavesurfer.load(audioURL);
            mainWavesurfer.on("ready", () => {
                mainWavesurfer.setVolume(0); // Mute main audio
            });
        };
    
        // Load stem audio files into wavesurfer players
        window.loadStems = function (stemData) {
            Object.entries(stemData).forEach(([stemName, stemURL]) => {
                let stemContainer = document.querySelector(`#waveform-${stemName}`);
                if (!stemContainer) {
                    console.warn(`Missing container for stem: ${stemName}`);
                    return;
                }
    
                stemPlayers[stemName] = WaveSurfer.create({
                    container: stemContainer,
                    waveColor: "lightblue",
                    progressColor: "blue",
                    cursorColor: "red",
                    backend: "MediaElement",
                    barWidth: 2,
                    responsive: true,
                    interact: false, // Don't allow seeking on stems
                });
    
                stemPlayers[stemName].load(stemURL);
            });
        };
    
        function syncStems(currentTime) {
            
            Object.entries(stemPlayers).forEach(([stemName, player]) => {
                if (player) {
                    player.setTime(currentTime);
                } else {
                }
            });
        }
        
    
        mainWavesurfer.on("seeking", function (currentTime) {  
            syncStems(currentTime);
        });
        
        
        // Play/pause functionality
        document.getElementById("playPauseBtn").addEventListener("click", function () {
            if (mainWavesurfer.isPlaying()) {
                mainWavesurfer.pause();
                Object.values(stemPlayers).forEach(player => player.pause());
                this.innerText = "▶";
            } else {
                let currentTime = mainWavesurfer.getCurrentTime();
                mainWavesurfer.play();
        
                Object.entries(stemPlayers).forEach(([stemName, player]) => {
                        player.setTime(currentTime);  // Ensure the stem starts at the correct position
                        player.play();
                    }
                );
                this.innerText = "⏸";
            }
        });
    
    
        // Toggle mute/unmute stems
        document.querySelectorAll(".stem-toggle").forEach(checkbox => {
            checkbox.addEventListener("change", function () {
                let stemName = this.dataset.stem;
                if (stemPlayers[stemName]) {
                    if (this.checked) {
                        stemPlayers[stemName].setVolume(1); // Unmute (full volume)
                    } else {
                        stemPlayers[stemName].setVolume(0); // Mute (silent)
                    }
                }
            });
        });
    
        // Adjust volume when sliders are moved
        document.querySelectorAll(".stem-volume").forEach((slider) => {
            slider.addEventListener("input", function () {
                let stemName = this.dataset.stem;  // Get the stem name (e.g., "drums", "bass")
                let volume = parseFloat(this.value);  // Directly use the slider value (0 to 1)
        
                console.log("Changing volume of", stemName, " to ", volume); // Debug log
        
                if (stemPlayers[stemName]) {  // Ensure the stem exists
                    stemPlayers[stemName].setVolume(volume); // ✅ Set volume for the correct stem
                }
                else {
                    console.error(`⚠️ Error: No wavesurfer instance found for ${stemName}`);
                }
            });
        });
    
        // Dynamically load audio files from backend after upload
        window.initializeAudio = function (mainAudioPath, stems) {
            loadMainAudio(mainAudioPath);
            loadStems(stems);
        };
    });