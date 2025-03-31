document.addEventListener('DOMContentLoaded', () => {
    // Handle New Meeting creation
    document.querySelector('#newMeetingBtn')?.addEventListener('click', async (e) => {
        e.preventDefault();
        
        try {
            const response = await fetch('/new-meeting');
            const data = await response.json();
            
            if(data.success) {
                // Show meeting link modal
                showMeetingLinkModal(data.roomId);
            }
        } catch (error) {
            showError('Failed to create meeting');
        }
    });

    // Handle Join form submission
    document.querySelector('#joinForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const codeInput = document.querySelector('#meetingCode');
        const code = codeInput.value.trim();

        if(!isValidCode(code)) {
            showError('Invalid meeting code format');
            return;
        }

        try {
            const response = await fetch('/join', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ code })
            });

            const data = await response.json();
            
            if(data.success) {
                window.location.href = `/room/${data.roomId}`;
            } else {
                showError(data.message || 'Failed to join meeting');
            }
        } catch (error) {
            showError('Connection error');
        }
    });

    // Validate meeting code format
    function isValidCode(code) {
        return /^[a-z0-9-]{8,}$/i.test(code);
    }

    // Show error message
    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4';
        errorDiv.innerHTML = `
            <span class="block sm:inline">${message}</span>
            <button class="absolute top-0 bottom-0 right-0 px-4 py-3" onclick="this.parentElement.remove()">
                <svg class="fill-current h-6 w-6 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/>
                </svg>
            </button>
        `;
        document.querySelector('#errorContainer').appendChild(errorDiv);
    }

    // Show meeting link modal
    function showMeetingLinkModal(roomId) {
        const meetingLink = `${window.location.origin}/room/${roomId}`;
        
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center';
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-8 max-w-md w-full">
                <h3 class="text-xl font-bold mb-4">Your meeting is ready</h3>
                <div class="flex items-center bg-gray-100 rounded p-3 mb-4">
                    <input type="text" 
                           id="meetingLink" 
                           value="${meetingLink}" 
                           class="flex-1 bg-transparent outline-none"
                           readonly>
                    <button onclick="copyToClipboard()" 
                            class="ml-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                        Copy
                    </button>
                </div>
                <p class="text-sm text-gray-600 mb-4">
                    Share this link with others. Participants need your permission to join.
                </p>
                <button onclick="window.location.href='/room/${roomId}'" 
                        class="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600">
                    Join Now
                </button>
            </div>
        `;

        document.body.appendChild(modal);
    }

    // Copy to clipboard function
    window.copyToClipboard = () => {
        const copyText = document.querySelector('#meetingLink');
        copyText.select();
        document.execCommand('copy');
        alert('Link copied to clipboard!');
    };
});