const form = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');
const clearButton = document.getElementById('clear-button');
const fileInput = document.getElementById('file-upload');
const fileTriggerButton = document.getElementById('file-trigger-button');
const filePreviewContainer = document.getElementById('file-preview-container');

let conversationHistory = [
  { role: 'model', text: 'Halo! Saya Gemini. Kirim teks untuk memulai.' }
];

clearButton.addEventListener('click', () => {
  chatBox.innerHTML = `
    <div class="message-wrapper">
      <div class="avatar bot">🤖</div>
      <div class="message bot">Halo! Saya Gemini. Kirim teks untuk memulai.</div>
    </div>
  `;
  conversationHistory = [
    { role: 'model', text: 'Halo! Saya Gemini. Kirim teks untuk memulai.' }
  ];
});

fileTriggerButton.addEventListener('click', () => {
  fileInput.click();
});

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

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const userMessage = userInput.value.trim();
  const file = fileInput.files[0];
  if (!userMessage && !file) return;

  const userDisplayMessage = file
    ? `${userMessage} [File: ${file.name}]`
    : userMessage;
  appendMessage('user', userDisplayMessage);

  const thinkingMessage = appendMessage('bot', 'Gemini is thinking...', ['loading']);
  conversationHistory.push({ role: 'user', text: userMessage });

  resetForm();

  try {
    let endpoint = '/chat';
    let options;

    if (file) {
      endpoint = '/multimodal';
      const formData = new FormData();
      formData.append('prompt', userMessage);
      formData.append('file', file);
      options = { method: 'POST', body: formData };
    } else {
      const payload = { conversation: conversationHistory };
      options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      };
    }

    const response = await fetch(`http://localhost:3000${endpoint}`, options);
    const result = await response.json();

    setTimeout(() => {
      if (result.success && result.data) {
        updateMessage(thinkingMessage, result.data);
        conversationHistory.push({ role: 'model', text: result.data });
      } else {
        updateMessage(thinkingMessage, `Error: ${result.message}`, ['error']);
      }
    }, 1000);
  } catch (error) {
    setTimeout(() => {
           updateMessage(thinkingMessage, `Network Error: ${error.message}`, ['error']);
    }, 1000);
  }
});

function appendMessage(sender, text, classes = []) {
  const wrapper = document.createElement('div');
  wrapper.classList.add('message-wrapper');

  const avatar = document.createElement('div');
  avatar.classList.add('avatar', sender);
  avatar.innerHTML = sender === 'user' ? '👤' : '🤖';

  const msg = document.createElement('div');
  msg.classList.add('message', sender, ...classes);
  msg.textContent = text;

  if (sender === 'user') {
    wrapper.appendChild(msg);
    wrapper.appendChild(avatar);
  } else {
    wrapper.appendChild(avatar);
    wrapper.appendChild(msg);
  }

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
