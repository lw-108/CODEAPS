export class AIChatSidebar {
    constructor(containerId) {
        this.container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
        this.messages = [];
        this.render();
    }

    render() {
        this.container.innerHTML = `
            <div class="ai-chat-sidebar">
                <div class="chat-messages premium-scroll" id="ai-chat-list">
                    <!-- Messages will be injected here -->
                    <div class="ai-message assistant">
                        <div class="message-header"><i class="fa-solid fa-robot"></i> ARCHITECT-AI</div>
                        <div class="message-content">Hello developer. How can I assist with your code architecture today?</div>
                    </div>
                </div>
                
                <div class="chat-input-area">
                    <div class="context-tags" id="chat-context-tags">
                        <span class="tag"><i class="fa-solid fa-file-code"></i> Active File</span>
                        <span class="tag"><i class="fa-solid fa-terminal"></i> Terminal</span>
                    </div>
                    <div class="textarea-wrapper">
                        <textarea id="ai-sidebar-input" placeholder="Ask anything..."></textarea>
                        <button class="btn-send" id="btn-send-chat">
                            <i class="fa-solid fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.chatList = document.getElementById('ai-chat-list');
        this.input = document.getElementById('ai-sidebar-input');
        
        document.getElementById('btn-send-chat').addEventListener('click', () => this.handleSendMessage());
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSendMessage();
            }
        });
    }

    async handleSendMessage() {
        const text = this.input.value.trim();
        if (!text) return;

        this.addMessage('user', text);
        this.input.value = '';

        // Mocking backend response
        this.addMessage('assistant', '...');
        const assistantMsgEl = this.chatList.lastElementChild.querySelector('.message-content');
        
        try {
            // Here we would call the backend API (http://localhost:8000/api/v1/ai/chat)
            // For now, let's simulate a streaming response
            let responseText = `I've analyzed your request: "${text}".\n\nBased on the current project context, I recommend refactoring the logic in the active module to improve "Perfect & Dynamic" attributes. Would you like me to generate a diff?`;
            let current = '';
            assistantMsgEl.textContent = '';
            
            for (let i = 0; i < responseText.length; i++) {
                current += responseText[i];
                assistantMsgEl.textContent = current;
                this.chatList.scrollTop = this.chatList.scrollHeight;
                await new Promise(r => setTimeout(r, 10)); // Simulate streaming
            }
        } catch (e) {
            assistantMsgEl.textContent = `Error: ${e.message}`;
            assistantMsgEl.classList.add('error');
        }
    }

    addMessage(role, text) {
        const msg = document.createElement('div');
        msg.className = `ai-message ${role}`;
        msg.innerHTML = `
            <div class="message-header">
                ${role === 'assistant' ? '<i class="fa-solid fa-robot"></i> ARCHITECT-AI' : '<i class="fa-solid fa-user"></i> YOU'}
            </div>
            <div class="message-content">${this.escapeHtml(text)}</div>
        `;
        this.chatList.appendChild(msg);
        this.chatList.scrollTop = this.chatList.scrollHeight;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
