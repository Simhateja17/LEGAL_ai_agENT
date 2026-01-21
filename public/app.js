// API Configuration
const API_BASE_URL = 'http://localhost:3000/api';

// DOM Elements
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendButton = document.getElementById('sendButton');

// Auto-resize textarea
chatInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
});

// Send message on Enter (Shift+Enter for new line)
chatInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Send message function
async function sendMessage() {
    const message = chatInput.value.trim();
    
    if (!message) return;

    // Disable input while processing
    chatInput.disabled = true;
    sendButton.disabled = true;

    // Add user message to chat
    addUserMessage(message);

    // Clear input
    chatInput.value = '';
    chatInput.style.height = 'auto';

    // Show typing indicator
    const typingId = showTypingIndicator();

    try {
        // Call API
        const response = await fetch(`${API_BASE_URL}/query/search?q=${encodeURIComponent(message)}`);
        const data = await response.json();

        // Remove typing indicator
        removeTypingIndicator(typingId);

        if (data.success) {
            // Add assistant response
            addAssistantMessage(data.data);
        } else {
            addErrorMessage('Entschuldigung, es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.');
        }
    } catch (error) {
        console.error('API Error:', error);
        removeTypingIndicator(typingId);
        addErrorMessage('Verbindungsfehler. Bitte stellen Sie sicher, dass der Server läuft (npm start).');
    } finally {
        // Re-enable input
        chatInput.disabled = false;
        sendButton.disabled = false;
        chatInput.focus();
    }
}

// Send suggestion
function sendSuggestion(text) {
    chatInput.value = text;
    sendMessage();
}

// Add user message to chat
function addUserMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message user-message';
    messageDiv.innerHTML = `
        <div class="message-avatar user-avatar">Sie</div>
        <div class="message-content">
            <div class="message-text">
                <p>${escapeHtml(text)}</p>
            </div>
        </div>
    `;
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

// Add assistant message to chat
function addAssistantMessage(data) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant-message';
    
    // Format the answer text
    const answerHtml = formatAnswer(data.antwort || data.answer);
    
    // Build law cards HTML
    let lawCardsHtml = '';
    if (data.gesetzestexte && data.gesetzestexte.length > 0) {
        lawCardsHtml = data.gesetzestexte.map(law => `
            <div class="law-card">
                <div class="law-header">
                    <div>
                        <div class="law-name">${escapeHtml(law.paragraph || '')} ${escapeHtml(law.gesetz || '')}</div>
                        <span class="law-category">${escapeHtml(law.kategorie || 'Deutsches Recht')}</span>
                        <span class="relevance-badge">${escapeHtml(law.relevanz)} Match</span>
                    </div>
                </div>
                <div class="law-title">${escapeHtml(law.titel || '')}</div>
                <div class="law-details">
                    ${escapeHtml((law.kurzinfo || '').substring(0, 200))}...
                </div>
            </div>
        `).join('');
    }
    
    messageDiv.innerHTML = `
        <div class="message-avatar assistant-avatar">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="#1a365d"/>
                <path d="M12 5L17 8V16L12 19L7 16V8L12 5Z" fill="white"/>
                <path d="M12 8L14 9.5V14.5L12 16L10 14.5V9.5L12 8Z" fill="#1a365d"/>
            </svg>
        </div>
        <div class="message-content">
            <div class="message-text">
                ${answerHtml}
                ${lawCardsHtml}
            </div>
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

// Format answer text with proper HTML
function formatAnswer(text) {
    if (!text) return '<p>Keine Antwort verfügbar.</p>';
    
    // Split by double newlines for paragraphs
    const lines = text.split('\n');
    let html = '';
    let currentParagraph = '';
    
    for (let line of lines) {
        line = line.trim();
        
        if (line === '' || line === '---') {
            if (currentParagraph) {
                html += `<p>${escapeHtml(currentParagraph)}</p>`;
                currentParagraph = '';
            }
            if (line === '---') {
                html += '<hr style="margin: 16px 0; border: none; border-top: 1px solid #e5e5e5;">';
            }
        } else if (line.startsWith('RECHTSAUSKUNFT') || line.startsWith('GESETZ') || line.startsWith('##') || line.startsWith('###')) {
            if (currentParagraph) {
                html += `<p>${escapeHtml(currentParagraph)}</p>`;
                currentParagraph = '';
            }
            const cleanLine = line.replace(/^#+\s*/, '');
            html += `<h3 style="margin-top: 12px; margin-bottom: 8px; color: #1a365d;">${escapeHtml(cleanLine)}</h3>`;
        } else if (line.startsWith('§') || line.startsWith('Art.')) {
            if (currentParagraph) {
                html += `<p>${escapeHtml(currentParagraph)}</p>`;
                currentParagraph = '';
            }
            html += `<p style="font-weight: 600; color: #1a365d;">⚖️ ${escapeHtml(line)}</p>`;
        } else if (line.startsWith('•') || line.match(/^\d+\./)) {
            if (currentParagraph) {
                html += `<p>${escapeHtml(currentParagraph)}</p>`;
                currentParagraph = '';
            }
            html += `<p style="margin-left: 16px;">• ${escapeHtml(line.replace(/^[•\d\.]\s*/, ''))}</p>`;
        } else {
            currentParagraph += (currentParagraph ? ' ' : '') + line;
        }
    }
    
    if (currentParagraph) {
        html += `<p>${escapeHtml(currentParagraph)}</p>`;
    }
    
    return html || '<p>Keine Antwort verfügbar.</p>';
}

// Extract price from text
function extractPrice(text) {
    const priceMatch = text.match(/(\d+)€/);
    if (priceMatch) {
        return `<div class="insurance-price">ab ${priceMatch[1]}€</div>`;
    }
    return '';
}

// Add error message
function addErrorMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant-message';
    messageDiv.innerHTML = `
        <div class="message-avatar assistant-avatar">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="#ef4444"/>
                <path d="M12 8V12M12 16H12.01" stroke="white" stroke-width="2" stroke-linecap="round"/>
            </svg>
        </div>
        <div class="message-content">
            <div class="message-text">
                <div class="error-message">${escapeHtml(text)}</div>
            </div>
        </div>
    `;
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

// Show typing indicator
function showTypingIndicator() {
    const id = 'typing-' + Date.now();
    const typingDiv = document.createElement('div');
    typingDiv.id = id;
    typingDiv.className = 'message assistant-message';
    typingDiv.innerHTML = `
        <div class="message-avatar assistant-avatar">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="#1a365d"/>
                <path d="M12 5L17 8V16L12 19L7 16V8L12 5Z" fill="white"/>
                <path d="M12 8L14 9.5V14.5L12 16L10 14.5V9.5L12 8Z" fill="#1a365d"/>
            </svg>
        </div>
        <div class="message-content">
            <div class="message-text">
                <div class="typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        </div>
    `;
    chatMessages.appendChild(typingDiv);
    scrollToBottom();
    return id;
}

// Remove typing indicator
function removeTypingIndicator(id) {
    const element = document.getElementById(id);
    if (element) {
        element.remove();
    }
}

// Scroll to bottom of chat
function scrollToBottom() {
    setTimeout(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 100);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Check server status on load
async function checkServerStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        const data = await response.json();
        console.log('✅ Server is running:', data);
    } catch (error) {
        console.error('❌ Server is not running. Please start with: npm start');
        addErrorMessage('Server nicht erreichbar. Bitte starten Sie den Server mit "npm start" im Terminal.');
    }
}

// Initialize
checkServerStatus();
chatInput.focus();
