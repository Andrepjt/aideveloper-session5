// --- DOM Element Selection ---
const form = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');
const clearButton = document.getElementById('clear-button');

const fileInput = document.getElementById('file-upload');
const fileTriggerButton = document.getElementById('file-trigger-button');
const filePreviewContainer = document.getElementById('file-preview-container');

// --- Event Listeners ---

// 4. Handle clear conversation
clearButton.addEventListener('click', () => {
    chatBox.innerHTML = `
      <div class="message-wrapper">
        <div class="message bot">
          Halo! Saya Gemini. Kirim teks, gambar, audio, atau dokumen untuk memulai.
        </div>
      </div>
    `;
});


// 1. Trigger hidden file input when our custom button is clicked
fileTriggerButton.addEventListener('click', () => {
    fileInput.click();
});

// 2. Handle file selection
fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        showFilePreview(file.name);
        fileTriggerButton.classList.add('file-selected');
    } else {
        hideFilePreview();
        fileTriggerButton.classList.remove('file-selected');
    }
});

// 3. Handle form submission
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const userMessage = userInput.value.trim();
    const file = fileInput.files[0];

    if (!userMessage && !file) return;

    const userDisplayMessage = file
        ? `${userMessage} [File: ${file.name}]`
        : userMessage;
    appendMessage('user', userDisplayMessage);

    const botLoadingMessage = appendMessage('bot', '...', ['loading']);

    const formData = new FormData();
    formData.append('prompt', userMessage);

    let endpoint = '/chat';
    if (file) {
        endpoint = '/multimodal';
        formData.append('file', file);
    }

    resetForm();

    try {
        const response = await fetch(`http://localhost:3000${endpoint}`, {
            method: 'POST',
            body: formData,
        });

        const result = await response.json();
        console.log('Server response:', result);

        if (result.success && result.data) {
            updateMessage(botLoadingMessage, result.data);
        } else {
            const fallback = result.message || 'Respons tidak dapat diproses.';
            updateMessage(botLoadingMessage, `Error: ${fallback}`, ['error']);
        }

    } catch (error) {
        console.error('Fetch error:', error);
        updateMessage(botLoadingMessage, `Network Error: ${error.message}`, ['error']);
    }
});

// --- Helper Functions ---

function appendMessage(sender, text, classes = []) {
    const wrapper = document.createElement('div');
    wrapper.classList.add('message-wrapper');

    const msg = document.createElement('div');
    msg.classList.add('message', sender, ...classes);
    msg.textContent = text;

    wrapper.appendChild(msg);
    chatBox.appendChild(wrapper);
    chatBox.scrollTop = chatBox.scrollHeight;
    return msg;
}

function updateMessage(msgElement, newText, classes = []) {
    msgElement.textContent = newText;
    msgElement.classList.remove('loading', 'error');
    if (classes.length > 0) {
        msgElement.classList.add(...classes);
    }
    chatBox.scrollTop = chatBox.scrollHeight;
}

function resetForm() {
    userInput.value = '';
    fileInput.value = '';
    hideFilePreview();
    fileTriggerButton.classList.remove('file-selected');
}

function showFilePreview(fileName) {
    filePreviewContainer.innerHTML = `
        <span id="file-preview-name">${fileName}</span>
        <button id="remove-file-button" type="button" aria-label="Remove file">&times;</button>
    `;
    filePreviewContainer.classList.remove('hidden');

    document.getElementById('remove-file-button').addEventListener('click', resetForm);
}

function hideFilePreview() {
    filePreviewContainer.innerHTML = '';
    filePreviewContainer.classList.add('hidden');
}
