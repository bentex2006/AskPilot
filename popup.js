
document.addEventListener('DOMContentLoaded', async () => {
    const statusElement = document.getElementById('status');
    const statusText = document.getElementById('page-status-text');
    const questionTextarea = document.getElementById('question');
    const predefinedQuestionsDiv = document.getElementById('predefined-questions');
    const askButton = document.getElementById('ask-button');
    const responseArea = document.getElementById('response-area');
    const aiResponseDiv = document.getElementById('ai-response');
    const copyButton = document.getElementById('copy-button');
    const downloadButton = document.getElementById('download-button');
    const downloadFormatPopup = document.getElementById('download-format-popup');
    const txtDownload = document.getElementById('txt-download');
    const docxDownload = document.getElementById('docx-download');
    const pdfDownload = document.getElementById('pdf-download');
    const settingsTab = document.getElementById('settings-tab');
    const askTab = document.getElementById('ask-tab');
    const settingsContent = document.getElementById('settings-content');
    const askContent = document.getElementById('ask-content');
    const apiKeyInput = document.getElementById('api-key');
    const modelInput = document.getElementById('model-input');
    const filterAdsCheckbox = document.getElementById('filter-ads');
    const saveSettingsButton = document.getElementById('save-settings');
    const developerCreditLink = document.getElementById('developer-credit-link');

    let pageContent = '';
    let aiResponse = '';

    // Content filtering function to remove ads and unwanted content
    function filterContent(content) {
        if (!content) return '';
        
        // Common ad/promotional keywords and patterns to filter out
        const adPatterns = [
            /advertisement/gi,
            /sponsored/gi,
            /\bads?\b/gi,
            /click here/gi,
            /buy now/gi,
            /limited time/gi,
            /subscribe/gi,
            /newsletter/gi,
            /popup/gi,
            /cookie/gi,
            /tracking/gi
        ];
        
        // Split content into lines and filter
        const lines = content.split('\n');
        const filteredLines = lines.filter(line => {
            // Skip empty lines or very short lines
            if (line.trim().length < 10) return false;
            
            // Check if line contains ad patterns
            const hasAdContent = adPatterns.some(pattern => pattern.test(line));
            if (hasAdContent) return false;
            
            // Skip lines that are mostly special characters or numbers
            if (/^[\s\d\W]{5,}$/.test(line)) return false;
            
            return true;
        });
        
        return filteredLines.join('\n').trim();
    }

    // Content Capture
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: () => {
                // Extract main content more intelligently
                const selectors = [
                    'article',
                    'main', 
                    '[role="main"]',
                    '.content',
                    '#content',
                    '.post-content',
                    '.entry-content',
                    '.article-body'
                ];
                
                let content = '';
                for (const selector of selectors) {
                    const element = document.querySelector(selector);
                    if (element && element.innerText.length > 100) {
                        content = element.innerText;
                        break;
                    }
                }
                
                // Fallback to body if no main content found
                if (!content) {
                    content = document.body.innerText;
                }
                
                return content;
            }
        }, async (results) => {
            if (results && results[0] && results[0].result) {
                const rawContent = results[0].result;
                const settings = await chrome.storage.sync.get(['filterAds']);
                
                // Apply filtering if enabled
                pageContent = settings.filterAds !== false ? filterContent(rawContent) : rawContent;
                
                statusElement.classList.add('loaded');
                statusText.textContent = 'Page Content Loaded';
                populatePredefinedQuestions(tab.url);
            } else {
                statusElement.classList.add('error');
                statusText.textContent = 'Failed to load page content';
            }
        });
    } catch (error) {
        statusElement.classList.add('error');
        statusText.textContent = 'Error accessing tab content';
        console.error('Error capturing page content:', error);
    }

    // Pre-defined Questions
    function populatePredefinedQuestions(url) {
        const hostname = new URL(url).hostname;
        let questions = [];

        if (hostname.includes('youtube.com')) {
            questions = ['Summarize this video', 'What are the key points?'];
        } else if (hostname.includes('wikipedia.org')) {
            questions = ['Summarize this article', 'What are the main facts?'];
        } else if (hostname.includes('amazon.') || hostname.includes('flipkart.')) {
            questions = ['What is this product?', 'What are the features?'];
        } else if (hostname.includes('github.com')) {
            questions = ['What does this code do?', 'Explain the project'];
        } else {
            questions = ['Summarize this page', 'Explain the main points', 'Is this reliable?'];
        }

        predefinedQuestionsDiv.innerHTML = '';
        questions.forEach(q => {
            const button = document.createElement('button');
            button.textContent = q;
            button.classList.add('predefined-q-button');
            button.addEventListener('click', () => {
                questionTextarea.value = q;
            });
            predefinedQuestionsDiv.appendChild(button);
        });
    }

    // Tab switching
    askTab.addEventListener('click', () => {
        askTab.classList.add('active');
        settingsTab.classList.remove('active');
        askContent.classList.add('active');
        askContent.classList.remove('hidden');
        settingsContent.classList.remove('active');
        settingsContent.classList.add('hidden');
    });

    settingsTab.addEventListener('click', () => {
        settingsTab.classList.add('active');
        askTab.classList.remove('active');
        settingsContent.classList.remove('hidden');
        settingsContent.classList.add('active');
        askContent.classList.remove('active');
        askContent.classList.add('hidden');
        loadSettings();
    });

    // Settings Management
    async function loadSettings() {
        const settings = await chrome.storage.sync.get(['apiKey', 'selectedModel', 'filterAds']);
        apiKeyInput.value = settings.apiKey || '';
        modelInput.value = settings.selectedModel || 'deepseek/deepseek-coder';
        filterAdsCheckbox.checked = settings.filterAds !== false;
    }

    async function saveSettings() {
        await chrome.storage.sync.set({
            apiKey: apiKeyInput.value,
            selectedModel: modelInput.value,
            filterAds: filterAdsCheckbox.checked
        });
        
        // Show success feedback
        const originalText = saveSettingsButton.textContent;
        saveSettingsButton.textContent = 'Saved!';
        saveSettingsButton.style.backgroundColor = 'var(--success-color)';
        
        setTimeout(() => {
            saveSettingsButton.textContent = originalText;
            saveSettingsButton.style.backgroundColor = 'var(--primary-color)';
        }, 2000);
    }

    saveSettingsButton.addEventListener('click', saveSettings);

    // API Call
    askButton.addEventListener('click', async () => {
        const userQuestion = questionTextarea.value.trim();
        if (!userQuestion) {
            aiResponseDiv.innerHTML = '<p class="error">Please enter a question.</p>';
            return;
        }

        if (!pageContent) {
            aiResponseDiv.innerHTML = '<p class="error">Page content not loaded yet. Please try again.</p>';
            return;
        }

        const settings = await chrome.storage.sync.get(['apiKey', 'selectedModel']);
        const apiKey = settings.apiKey;
        const model = settings.selectedModel || 'deepseek/deepseek-coder';

        if (!apiKey) {
            aiResponseDiv.innerHTML = '<p class="error">API key is missing. Please go to Settings to add your OpenRouter API key.</p>';
            return;
        }

        // Show loading state
        askButton.textContent = 'Asking AI...';
        askButton.disabled = true;
        aiResponseDiv.innerHTML = '<p>Processing your question...</p>';

        const prompt = `Based on the following page content, answer the user's question clearly and concisely:

Page Content:
"""
${pageContent}
"""

User Question: ${userQuestion}

Please provide a helpful and accurate response based on the page content.`;

        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        { role: 'user', content: prompt }
                    ],
                    max_tokens: 1000
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
            }

            const data = await response.json();
            aiResponse = data.choices[0]?.message?.content || 'No response from AI.';
            displayResponse(aiResponse);

        } catch (error) {
            aiResponseDiv.innerHTML = `<p class="error">Error: ${error.message}</p>`;
            console.error('API Call Error:', error);
        } finally {
            askButton.textContent = 'Ask AI';
            askButton.disabled = false;
        }
    });

    // Display Response with better formatting
    function displayResponse(text) {
        let html = text
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/^\* (.*$)/gim, '<li>$1</li>')
            .replace(/^\- (.*$)/gim, '<li>$1</li>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');

        html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

        aiResponseDiv.innerHTML = html;
    }

    // Copy functionality
    copyButton.addEventListener('click', () => {
        if (aiResponse) {
            navigator.clipboard.writeText(aiResponse).then(() => {
                const originalText = copyButton.textContent;
                copyButton.textContent = 'Copied!';
                setTimeout(() => {
                    copyButton.textContent = originalText;
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy:', err);
            });
        }
    });

    // Download functionality
    downloadButton.addEventListener('click', () => {
        if (aiResponse) {
            downloadFormatPopup.classList.toggle('hidden');
        }
    });

    txtDownload.addEventListener('click', () => downloadResponse('txt'));
    docxDownload.addEventListener('click', () => downloadResponse('docx'));
    pdfDownload.addEventListener('click', () => downloadResponse('pdf'));

    function downloadResponse(format) {
        if (!aiResponse) return;

        let blob;
        let filename = `askpilot_response_${Date.now()}.${format}`;

        if (format === 'txt') {
            blob = new Blob([aiResponse], { type: 'text/plain' });
        } else if (format === 'docx') {
            // Simple text content for DOCX
            blob = new Blob([aiResponse], { type: 'text/plain' });
            filename = filename.replace('.docx', '.txt');
        } else if (format === 'pdf') {
            // Simple text content for PDF
            blob = new Blob([aiResponse], { type: 'text/plain' });
            filename = filename.replace('.pdf', '.txt');
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        downloadFormatPopup.classList.add('hidden');
    }

    // Close download popup when clicking outside
    document.addEventListener('click', (event) => {
        if (!downloadButton.contains(event.target) && !downloadFormatPopup.contains(event.target)) {
            downloadFormatPopup.classList.add('hidden');
        }
    });

    // Developer credit link
    if (developerCreditLink) {
        developerCreditLink.addEventListener('click', (event) => {
            event.preventDefault();
            chrome.tabs.create({ url: developerCreditLink.href });
        });
    }

    // Initial settings load
    loadSettings();
});
