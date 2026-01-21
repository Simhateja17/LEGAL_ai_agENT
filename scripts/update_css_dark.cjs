:root {
    --bg-dark: #212121;
    --bg-sidebar: #171717;
    --bg-input: #303030;
    --text-primary: #ECECEC;
    --text-secondary: #B4B4B4;
    --accent: #FFFFFF;
    --border: #424242;
    --hover: #2F2F2F;
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Söhne', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    background-color: var(--bg-dark);
    color: var(--text-primary);
    min-height: 100vh;
    overflow: hidden;
}

.layout {
    display: flex;
    height: 100vh;
}

/* Sidebar */
.sidebar {
    width: 260px;
    background: var(--bg-sidebar);
    display: flex;
    flex-direction: column;
    padding: 0.875rem;
    flex-shrink: 0;
}

.new-chat {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: background-color 0.2s;
    border: 1px solid rgba(255,255,255,0.2);
    margin-bottom: 2rem;
}

.new-chat:hover {
    background-color: var(--hover);
}

.new-chat-icon {
    width: 28px;
    height: 28px;
    background: white;
    border-radius: 50%;
    color: black;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    font-weight: 300;
}

.new-chat span {
    font-size: 0.875rem;
    font-weight: 500;
}

.sidebar-nav {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.nav-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    border-radius: 0.5rem;
    cursor: pointer;
    color: var(--text-primary);
    transition: background-color 0.2s;
}

.nav-item:hover, .nav-item.active {
    background-color: var(--hover);
}

.nav-item span {
    font-size: 0.875rem;
}

.sidebar-user {
    padding-top: 1rem;
    border-top: 1px solid var(--border);
}

.user-profile {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem;
    cursor: pointer;
    border-radius: 0.5rem;
    transition: background-color 0.2s;
}

.user-profile:hover {
    background-color: var(--hover);
}

.user-avatar {
    width: 32px;
    height: 32px;
    background: #008779;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.875rem;
    font-weight: 600;
    color: white;
}

.user-name {
    font-size: 0.875rem;
    font-weight: 500;
}

/* Main Content */
.main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    position: relative;
    max-width: 100%;
}

.chat-area {
    flex: 1;
    overflow-y: auto;
    padding-bottom: 200px;
    scroll-behavior: smooth;
}

.welcome-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 2rem;
    text-align: center;
}

.logo-circle {
    width: 64px;
    height: 64px;
    background: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    margin-bottom: 2rem;
    box-shadow: 0 0 20px rgba(255,255,255,0.1);
}

.welcome-screen h1 {
    font-size: 2rem;
    font-weight: 600;
    margin-bottom: 3rem;
    letter-spacing: -0.02em;
}

/* Chat Messages */
.chat-messages {
    max-width: 768px;
    margin: 0 auto;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    gap: 2rem;
}

.message {
    display: flex;
    gap: 1.5rem;
    line-height: 1.7;
    font-size: 1rem;
}

.message-avatar {
    width: 30px;
    height: 30px;
    border-radius: 4px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
}

.assistant-avatar {
    background: #10a37f; /* ChatGPT green */
}

/* For assistant svg inside avatar */
.assistant-avatar svg {
    width: 20px;
    height: 20px;
    color: white;
}

.user-avatar-small {
    background: #5D5D5D;
    border-radius: 4px;
    color: white;
    font-size: 12px;
}

.message-content {
    min-width: 0;
    flex: 1;
}

.assistant-message .message-content {
    color: #ECECEC;
}

.user-message .message-content {
    color: #ECECEC;
}

/* Markdown Styles */
.message-content h3 {
    font-weight: 600;
    margin-bottom: 0.5rem;
    font-size: 1.1rem;
    color: white;
}

.message-content p {
    margin-bottom: 1rem;
}

.message-content p:last-child {
    margin-bottom: 0;
}

/* Input Area Wrapper */
.input-area-wrapper {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    background-image: linear-gradient(180deg, rgba(33,33,33,0), #212121 20%);
    padding: 2rem 0 1.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.suggestion-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
    max-width: 768px;
    width: 100%;
    padding: 0 1rem;
    margin-bottom: 1rem;
}
/* Hide suggestions when chat is active - controlled via JS */

.suggestion-card {
    border: 1px solid var(--border);
    border-radius: 0.75rem;
    padding: 0.75rem 1rem;
    cursor: pointer;
    background: transparent;
    transition: background-color 0.2s;
}

.suggestion-card:hover {
    background-color: var(--hover);
}

.suggestion-text {
    font-size: 0.875rem;
    color: var(--text-secondary);
    font-weight: 400;
}

.suggestion-card:hover .suggestion-text {
    color: var(--text-primary);
}

.input-container {
    max-width: 768px;
    width: calc(100% - 2rem);
    background: var(--bg-input);
    border-radius: 1.5rem; /* Pill shape initially, adapts */
    padding: 0.75rem 1rem 0.75rem 1.25rem; /* Updated padding */
    display: flex;
    align-items: flex-end;
    gap: 0.75rem;
    box-shadow: 0 0 15px rgba(0,0,0,0.1);
    border: 1px solid transparent; /* Prepare for focus state */
}

.input-container:focus-within {
    border-color: #555;
    background: #404040;
}

.chat-input {
    flex: 1;
    background: transparent;
    border: none;
    color: white;
    font-size: 1rem;
    resize: none;
    max-height: 200px;
    outline: none;
    font-family: inherit;
    line-height: 1.5;
    padding: 0.25rem 0; /* Align with button */
}

.chat-input::placeholder {
    color: #8e8e8e;
}

.send-button {
    background: white; /* Enabled state */
    border: none;
    width: 32px;
    height: 32px;
    border-radius: 0.5rem; /* Rounded square */
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: opacity 0.2s;
    color: black;
}

.send-button:disabled {
    background: transparent;
    color: #555;
    cursor: default;
}

.disclaimer {
    font-size: 0.75rem;
    color: #6e6e6e;
    margin-top: 0.75rem;
    text-align: center;
}

/* Scrollbar */
::-webkit-scrollbar {
    width: 8px;
}
::-webkit-scrollbar-track {
    background: transparent;
}
::-webkit-scrollbar-thumb {
    background: #555;
    border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
    background: #666;
}

@media (max-width: 768px) {
    .sidebar {
        display: none; /* Simple mobile hide */
    }
    .suggestion-grid {
        grid-template-columns: 1fr;
    }
}

/* Insurance/Law Cards inside messages */
.law-card {
    background: #2F2F2F;
    border: 1px solid #444;
    border-radius: 0.5rem;
    padding: 1rem;
    margin-top: 1rem;
    border-left: 3px solid #10a37f;
}

.law-name {
    color: #10a37f;
    font-weight: 600;
    font-size: 0.95rem;
    margin-bottom: 0.25rem;
}

.law-title {
    color: #ECECEC;
    font-weight: 500;
    margin-bottom: 0.5rem;
}

.law-details {
    color: #B4B4B4;
    font-size: 0.9rem;
}

.law-category {
    background: #444;
    color: #CCC;
    border-radius: 4px;
    padding: 2px 6px;
    font-size: 0.75rem;
    display: inline-block;
    margin-right: 8px;
}

strong {
    color: white;
}
`;

const fs = require('fs');
fs.writeFileSync('public/style.css', cssContent);
console.log('style.css updated');
