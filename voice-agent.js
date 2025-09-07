// Zekitales Voice Assistant with Floating Circle UI
class AIVoiceAgent {
    constructor(options = {}) {
        this.apiKey = options.apiKey || null;
        this.isListening = false;
        this.isProcessing = false;
        this.isSpeaking = false;
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.voices = [];
        this.currentVoice = null;
        
        // Configuration
        this.config = {
            language: options.language || 'en-US',
            voiceRate: options.voiceRate || 1,
            voicePitch: options.voicePitch || 1,
            voiceVolume: options.voiceVolume || 1,
            autoListen: options.autoListen || false,
            maxSpeechLength: options.maxSpeechLength || 30000, // 30 seconds
            silenceTimeout: options.silenceTimeout || 3000, // 3 seconds
            aiModel: options.aiModel || 'gpt-3.5-turbo',
            systemPrompt: options.systemPrompt || 'You are a helpful AI assistant for Zekitales digital agency. Provide brief, friendly responses about web development, design, and digital services.'
        };

        this.conversationHistory = [];
        this.init();
    }

    async init() {
        try {
            await this.initializeSpeechRecognition();
            await this.initializeSpeechSynthesis();
            this.createVoiceInterface();
            this.bindEvents();
            console.log('AI Voice Agent initialized successfully');
        } catch (error) {
            console.error('AI Voice Agent initialization error:', error);
        }
    }

    async initializeSpeechRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            throw new Error('Speech Recognition not supported in this browser');
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = this.config.language;
        this.recognition.maxAlternatives = 1;

        this.recognition.onstart = () => {
            this.isListening = true;
            this.updateUI('listening');
            this.showStatus('Listening... Speak now');
        };

        this.recognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            this.updateTranscript(finalTranscript + interimTranscript);

            if (finalTranscript) {
                this.processVoiceInput(finalTranscript.trim());
            }
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.isListening = false;
            this.updateUI('idle');
            
            let errorMessage = 'Speech recognition error: ';
            switch (event.error) {
                case 'no-speech':
                    errorMessage += 'No speech detected. Please try again.';
                    break;
                case 'audio-capture':
                    errorMessage += 'Microphone not accessible. Please check permissions.';
                    break;
                case 'not-allowed':
                    errorMessage += 'Microphone access denied. Please allow microphone access.';
                    break;
                default:
                    errorMessage += event.error;
            }
            this.showError(errorMessage);
        };

        this.recognition.onend = () => {
            this.isListening = false;
            if (!this.isProcessing) {
                this.updateUI('idle');
                this.showStatus('Click to start listening');
            }
        };
    }

    async initializeSpeechSynthesis() {
        if (!this.synthesis) {
            throw new Error('Speech Synthesis not supported in this browser');
        }

        // Wait for voices to load
        return new Promise((resolve) => {
            const loadVoices = () => {
                this.voices = this.synthesis.getVoices();
                if (this.voices.length > 0) {
                    // Prefer English voices
                    this.currentVoice = this.voices.find(voice => 
                        voice.lang.startsWith('en') && voice.name.includes('Google')
                    ) || this.voices.find(voice => 
                        voice.lang.startsWith('en')
                    ) || this.voices[0];
                    resolve();
                } else {
                    // Voices might not be loaded yet
                    setTimeout(loadVoices, 100);
                }
            };

            if (this.synthesis.onvoiceschanged !== undefined) {
                this.synthesis.onvoiceschanged = loadVoices;
            }
            loadVoices();
        });
    }

    createVoiceInterface() {
        // Create floating circle button
        const floatingButton = document.createElement('div');
        floatingButton.id = 'voice-agent-floating-btn';
        floatingButton.innerHTML = `
            <div class="floating-btn">
                <i class="fas fa-microphone"></i>
                <div class="status-indicator" id="statusIndicator"></div>
            </div>
        `;

        // Create voice agent panel (initially hidden)
        const voicePanel = document.createElement('div');
        voicePanel.id = 'voice-agent-panel';
        voicePanel.style.display = 'none';
        voicePanel.innerHTML = `
            <div class="voice-panel-header">
                <h3><i class="fas fa-microphone"></i> Zeki Assistant</h3>
                <button class="close-panel" id="closePanel">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="voice-panel-content">
                <div class="voice-status">
                    <span class="status-text" id="statusText">Ready to help</span>
                </div>
                
                <div class="transcript-container">
                    <div class="transcript-section">
                        <label>You said:</label>
                        <div class="transcript-text" id="userTranscript">...</div>
                    </div>
                    <div class="transcript-section">
                        <label>AI Response:</label>
                        <div class="transcript-text" id="aiResponse">...</div>
                    </div>
                </div>

                <div class="voice-controls">
                    <button class="voice-btn voice-btn-primary" id="startListening">
                        <i class="fas fa-microphone"></i>
                        <span>Start Listening</span>
                    </button>
                    <button class="voice-btn voice-btn-secondary" id="stopSpeaking">
                        <i class="fas fa-stop"></i>
                        <span>Stop Speaking</span>
                    </button>
                </div>

                <div class="voice-settings">
                    <div class="setting-group">
                        <label for="voiceSelect">Voice:</label>
                        <select id="voiceSelect" class="voice-select"></select>
                    </div>
                    <div class="setting-group">
                        <label for="voiceRate">Speed:</label>
                        <input type="range" id="voiceRate" min="0.5" max="2" step="0.1" value="1" class="voice-slider">
                        <span class="slider-value">1x</span>
                    </div>
                    <div class="setting-group">
                        <label for="voicePitch">Pitch:</label>
                        <input type="range" id="voicePitch" min="0.5" max="2" step="0.1" value="1" class="voice-slider">
                        <span class="slider-value">1x</span>
                    </div>
                </div>

               
        `;

        // Add styles
        const styles = `
            <style>
                #voice-agent-floating-btn {
                    position: fixed;
                    bottom: 25px;
                    right: 25px;
                    z-index: 10000;
                }

                .floating-btn {
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, var(--secondary) 0%, #f59e0b 100%);
                    color: var(--dark);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    box-shadow: 0 4px 20px rgba(233, 153, 5, 0.4);
                    border: none;
                    transition: all 0.3s ease;
                    position: relative;
                }

                .floating-btn:hover {
                    transform: scale(1.1);
                }

                .floating-btn.listening {
                    animation: pulse 1.5s infinite;
                    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                }

                .floating-btn.processing {
                    background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
                    animation: spin 1s linear infinite;
                }

                .floating-btn.speaking {
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    animation: pulse 0.5s infinite;
                }

                .floating-btn i {
                    font-size: 24px;
                }

                .status-indicator {
                    position: absolute;
                    top: -5px;
                    right: -5px;
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    background: #6b7280;
                    transition: all 0.3s ease;
                }

                .status-indicator.listening {
                    background: #ef4444;
                    animation: pulse 1s infinite;
                }

                .status-indicator.processing {
                    background: #f59e0b;
                    animation: spin 1s linear infinite;
                }

                .status-indicator.speaking {
                    background: #10b981;
                    animation: pulse 0.5s infinite;
                }

                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.2); }
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                #voice-agent-panel {
                    position: fixed;
                    bottom: 100px;
                    right: 25px;
                    width: 350px;
                    max-width: calc(100vw - 40px);
                    background: linear-gradient(135deg, #1a1a2e 0%, #000000ff 100%);
                    border: 1px solid #333;
                    border-radius: 15px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                    z-index: 10000;
                    font-family: 'Inter', sans-serif;
                    color: #ffffff;
                }

                .voice-panel-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 15px 20px;
                    background: linear-gradient(135deg, #e99905 0%, #f59e0b 100%);
                    color: #000;
                    border-radius: 15px 15px 0 0;
                }

                .voice-panel-header h3 {
                    margin: 0;
                    font-size: 16px;
                    font-weight: 600;
                }

                .close-panel {
                    background: none;
                    border: none;
                    color: #000;
                    font-size: 16px;
                    cursor: pointer;
                    padding: 5px;
                    border-radius: 50%;
                }

                .voice-panel-content {
                    padding: 20px;
                    max-height: 500px;
                    overflow-y: auto;
                }

                .voice-status {
                    padding: 10px;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 10px;
                    margin-bottom: 20px;
                    text-align: center;
                }

                .transcript-container {
                    margin-bottom: 20px;
                }

                .transcript-section {
                    margin-bottom: 15px;
                }

                .transcript-section label {
                    display: block;
                    font-size: 12px;
                    font-weight: 500;
                    color: #e99905;
                    margin-bottom: 5px;
                }

                .transcript-text {
                    background: rgba(255, 255, 255, 0.05);
                    padding: 10px;
                    border-radius: 6px;
                    font-size: 14px;
                    line-height: 1.4;
                    min-height: 20px;
                    border-left: 3px solid #e99905;
                }

                .voice-controls {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 20px;
                }

                .voice-btn {
                    flex: 1;
                    padding: 12px 16px;
                    border: none;
                    border-radius: 8px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    font-size: 14px;
                }

                .voice-btn-primary {
                    background: #e99905;
                    color: #000;
                }

                .voice-btn-primary:hover {
                    background: #f59e0b;
                    transform: translateY(-2px);
                }

                .voice-btn-primary:disabled {
                    background: #6b7280;
                    cursor: not-allowed;
                    transform: none;
                }

                .voice-btn-secondary {
                    background: rgba(255, 255, 255, 0.1);
                    color: #ffffff;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                }

                .voice-btn-secondary:hover {
                    background: rgba(255, 255, 255, 0.2);
                }

                .voice-settings {
                    margin-bottom: 20px;
                }

                .setting-group {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 10px;
                }

                .setting-group label {
                    font-size: 12px;
                    font-weight: 500;
                    min-width: 50px;
                }

                .voice-select {
                    flex: none;
                    width: 160px;
                    padding: 6px 10px;
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 6px;
                    color: #ffffff;
                    font-size: 12px;
                }

                .voice-slider {
                    flex: 1;
                    margin: 0 10px;
                }

                .slider-value {
                    font-size: 12px;
                    min-width: 30px;
                    text-align: center;
                }

                .api-key-section {
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                    padding-top: 15px;
                }

                .voice-select option {
                background: #1a1a2e;
                color: #ffffff;
                }


                @media (max-width: 768px) {
                    #voice-agent-panel {
                        width: calc(100vw - 20px);
                        right: 10px;
                        bottom: 80px;
                    }
                    
                    .floating-btn {
                        bottom: 15px;
                        right: 15px;
                    }
                }
            </style>
        `;

        document.head.insertAdjacentHTML('beforeend', styles);
        document.body.appendChild(floatingButton);
        document.body.appendChild(voicePanel);

        this.populateVoiceSelect();
    }

    bindEvents() {
        const floatingBtn = document.getElementById('voice-agent-floating-btn');
        const panel = document.getElementById('voice-agent-panel');
        const closeBtn = document.getElementById('closePanel');
        const startBtn = document.getElementById('startListening');
        const stopBtn = document.getElementById('stopSpeaking');
        const voiceSelect = document.getElementById('voiceSelect');
        const rateSlider = document.getElementById('voiceRate');
        const pitchSlider = document.getElementById('voicePitch');
        const apiKeyInput = document.getElementById('apiKeyInput');
        const saveApiKeyBtn = document.getElementById('saveApiKey');

        // Toggle voice panel
        floatingBtn.addEventListener('click', () => {
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        });

        // Close panel
        closeBtn.addEventListener('click', () => {
            panel.style.display = 'none';
        });

        // Start listening
        startBtn.addEventListener('click', () => {
            if (this.isListening) {
                this.stopListening();
            } else {
                this.startListening();
            }
        });

        // Stop speaking
        stopBtn.addEventListener('click', () => {
            this.stopSpeaking();
        });

        // Voice selection
        voiceSelect.addEventListener('change', (e) => {
            const selectedVoice = this.voices.find(voice => voice.name === e.target.value);
            if (selectedVoice) {
                this.currentVoice = selectedVoice;
            }
        });

        // Rate slider
        rateSlider.addEventListener('input', (e) => {
            this.config.voiceRate = parseFloat(e.target.value);
            e.target.nextElementSibling.textContent = e.target.value + 'x';
        });

        // Pitch slider
        pitchSlider.addEventListener('input', (e) => {
            this.config.voicePitch = parseFloat(e.target.value);
            e.target.nextElementSibling.textContent = e.target.value + 'x';
        });

        // API key management
        saveApiKeyBtn.addEventListener('click', () => {
            const apiKey = apiKeyInput.value.trim();
            if (apiKey) {
                this.apiKey = apiKey;
                localStorage.setItem('aiVoiceAgentApiKey', apiKey);
                this.showStatus('API key saved successfully');
                apiKeyInput.value = '';
            }
        });

        // Load saved API key
        const savedApiKey = localStorage.getItem('aiVoiceAgentApiKey');
        if (savedApiKey) {
            this.apiKey = savedApiKey;
        }
    }

    populateVoiceSelect() {
        const voiceSelect = document.getElementById('voiceSelect');
        if (!voiceSelect) return;

        voiceSelect.innerHTML = '';
        this.voices.forEach(voice => {
            const option = document.createElement('option');
            option.value = voice.name;
            option.textContent = `${voice.name} (${voice.lang})`;
            if (voice === this.currentVoice) {
                option.selected = true;
            }
            voiceSelect.appendChild(option);
        });
    }

    startListening() {
        if (!this.recognition || this.isListening) return;

        try {
            this.recognition.start();
            document.getElementById('startListening').innerHTML = `
                <i class="fas fa-stop"></i>
                <span>Stop Listening</span>
            `;
        } catch (error) {
            console.error('Failed to start listening:', error);
            this.showError('Failed to start listening. Please try again.');
        }
    }

    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
            this.isListening = false;
            this.updateUI('idle');
            document.getElementById('startListening').innerHTML = `
                <i class="fas fa-microphone"></i>
                <span>Start Listening</span>
            `;
        }
    }

    async processVoiceInput(transcript) {
        this.isProcessing = true;
        this.updateUI('processing');
        this.showStatus('Processing your request...');

        try {
            document.getElementById('userTranscript').textContent = transcript;
            
            let response;
            if (this.apiKey) {
                response = await this.getAIResponse(transcript);
            } else {
                response = this.getPredefinedResponse(transcript);
            }

            document.getElementById('aiResponse').textContent = response;
            await this.speak(response);
            
        } catch (error) {
            console.error('Error processing voice input:', error);
            const errorResponse = "I'm sorry, I encountered an error processing your request. Please try again.";
            document.getElementById('aiResponse').textContent = errorResponse;
            await this.speak(errorResponse);
        } finally {
            this.isProcessing = false;
            this.updateUI('idle');
        }
    }

    async getAIResponse(userInput) {
        if (!this.apiKey) {
            throw new Error('API key not provided');
        }

        const messages = [
            {
                role: 'system',
                content: this.config.systemPrompt
            },
            ...this.conversationHistory,
            {
                role: 'user',
                content: userInput
            }
        ];

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: this.config.aiModel,
                messages: messages,
                max_tokens: 150,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();
        const aiResponse = data.choices[0].message.content.trim();

        // Update conversation history
        this.conversationHistory.push(
            { role: 'user', content: userInput },
            { role: 'assistant', content: aiResponse }
        );

        // Keep only last 10 messages to manage context length
        if (this.conversationHistory.length > 10) {
            this.conversationHistory = this.conversationHistory.slice(-10);
        }

        return aiResponse;
    }

    getPredefinedResponse(userInput) {
        const input = userInput.toLowerCase();
        
        // Zekitales-specific responses
        if (input.includes('zekitales') || input.includes('about') || input.includes('who are you')) {
    return "Zekitales is a digital agency specializing in web development, design, and digital solutions. We create custom websites, mobile apps, and provide full-stack development services.";
}

if (input.includes('service') || input.includes('what do you do') || input.includes('offer')) {
    return "We offer web development, UI/UX design, WordPress development, PHP and SQL development, ecommerce solutions, and custom digital products.";
}

if (input.includes('technology') || input.includes('tech stack') || input.includes('tools')) {
    return "We work with HTML, CSS, JavaScript, React, Next.js, Node.js, PHP, SQL, MongoDB, WordPress, and other modern technologies.";
}

if (input.includes('contact') || input.includes('reach') || input.includes('email') || input.includes('call')) {
    return "You can contact Zekitales at zekitales@gmail.com or call +92 321 3995991. We're a remote-first team serving clients globally.";
}

if (input.includes('location') || input.includes('where') || input.includes('address')) {
    return "Zekitales is a remote digital agency, collaborating with clients around the world.";
}

if (input.includes('price') || input.includes('cost') || input.includes('quote') || input.includes('budget')) {
    return "Our pricing depends on your project requirements. We provide custom quotes with transparent and competitive rates.";
}

if (input.includes('time') || input.includes('how long') || input.includes('duration') || input.includes('deadline')) {
    return "Simple websites usually take 1–2 weeks, while larger apps may take 4–8 weeks. Timelines depend on project complexity.";
}

if (input.includes('process') || input.includes('workflow') || input.includes('steps')) {
    return "Our process includes Discovery, Planning, Design, Development, Testing, and Launch to ensure quality and transparency.";
}

if (input.includes('portfolio') || input.includes('projects') || input.includes('work')) {
    return "You can check our portfolio to see examples of the websites and apps we’ve built for clients.";
}

if (input.includes('testimonial') || input.includes('clients') || input.includes('reviews')) {
    return "Our clients love working with us! We have testimonials highlighting our quality, transparency, and reliability.";
}

if (input.includes('team') || input.includes('members') || input.includes('staff')) {
    return "Zekitales is powered by a team of experienced developers, designers, and strategists.";
}

if (input.includes('career') || input.includes('jobs') || input.includes('hiring')) {
    return "We’re always looking for talent. You can check our careers section or email us to join Zekitales.";
}

if (input.includes('blog') || input.includes('articles') || input.includes('news')) {
    return "We publish blogs and insights about web development, design, and digital trends.";
}

if (input.includes('faq') || input.includes('questions') || input.includes('common')) {
    return "Here are answers to frequently asked questions about Zekitales, our services, and our process.";
}

if (input.includes('hello') || input.includes('hi') || input.includes('hey') || input.includes('salam')) {
    return "Hello! Welcome to Zekitales. I'm your AI assistant. How can I help you today?";
}

if (input.includes('help') || input.includes('support') || input.includes('assist')) {
    return "I'm here to help! Ask me about our services, pricing, technologies, or how to start your project.";
}

if (input.includes('bye') || input.includes('goodbye') || input.includes('see you')) {
    return "Goodbye! It was nice talking to you. Reach out to Zekitales anytime.";
}

// Default
return "Thank you for your question! For more details about our services, visit our website or contact us directly. We'd be happy to discuss your project.";

    }

    async speak(text) {
        if (!this.synthesis || this.isSpeaking) return;

        return new Promise((resolve) => {
            // Stop any ongoing speech
            this.synthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.voice = this.currentVoice;
            utterance.rate = this.config.voiceRate;
            utterance.pitch = this.config.voicePitch;
            utterance.volume = this.config.voiceVolume;

            utterance.onstart = () => {
                this.isSpeaking = true;
                this.updateUI('speaking');
                this.showStatus('Speaking...');
            };

            utterance.onend = () => {
                this.isSpeaking = false;
                this.updateUI('idle');
                this.showStatus('Ready to help');
                resolve();
            };

            utterance.onerror = (event) => {
                console.error('Speech synthesis error:', event);
                this.isSpeaking = false;
                this.updateUI('idle');
                resolve();
            };

            this.synthesis.speak(utterance);
        });
    }

    stopSpeaking() {
        if (this.synthesis) {
            this.synthesis.cancel();
            this.isSpeaking = false;
            this.updateUI('idle');
            this.showStatus('Speech stopped');
        }
    }

    updateUI(state) {
        const floatingBtn = document.querySelector('.floating-btn');
        const indicator = document.getElementById('statusIndicator');
        const startBtn = document.getElementById('startListening');
        
        if (!floatingBtn || !indicator || !startBtn) return;

        // Remove all state classes
        floatingBtn.className = 'floating-btn';
        indicator.className = 'status-indicator';
        
        // Add current state class
        if (state !== 'idle') {
            floatingBtn.classList.add(state);
            indicator.classList.add(state);
        }

        // Update button state
        switch (state) {
            case 'listening':
                startBtn.innerHTML = `<i class="fas fa-stop"></i><span>Stop Listening</span>`;
                startBtn.disabled = false;
                break;
            case 'processing':
                startBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i><span>Processing...</span>`;
                startBtn.disabled = true;
                break;
            case 'speaking':
                startBtn.innerHTML = `<i class="fas fa-volume-up"></i><span>Speaking...</span>`;
                startBtn.disabled = true;
                break;
            default:
                startBtn.innerHTML = `<i class="fas fa-microphone"></i><span>Start Listening</span>`;
                startBtn.disabled = false;
        }
    }

    updateTranscript(text) {
        const userTranscript = document.getElementById('userTranscript');
        if (userTranscript) {
            userTranscript.textContent = text || '...';
        }
    }

    showStatus(message) {
        const statusText = document.getElementById('statusText');
        if (statusText) {
            statusText.textContent = message;
        }
    }

    showError(message) {
        console.error(message);
        this.showStatus(`Error: ${message}`);
        
        // Show error notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ef4444;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10001;
            max-width: 300px;
            font-size: 14px;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 5000);
    }

    // Public methods for external control
    toggle() {
        const panel = document.getElementById('voice-agent-panel');
        if (panel) {
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        }
    }

    setApiKey(apiKey) {
        this.apiKey = apiKey;
        localStorage.setItem('aiVoiceAgentApiKey', apiKey);
    }

    clearConversation() {
        this.conversationHistory = [];
        document.getElementById('userTranscript').textContent = '...';
        document.getElementById('aiResponse').textContent = '...';
    }
}

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize AI Voice Agent
    window.aiVoiceAgent = new AIVoiceAgent({
        language: 'en-US',
        voiceRate: 1,
        voicePitch: 1,
        systemPrompt: 'You are a helpful AI assistant for Zekitales digital agency. Provide brief, friendly responses (2-3 sentences max) about web development, design, digital services, and company information. Be conversational and helpful.'
    });
});