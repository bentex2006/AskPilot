document.addEventListener('DOMContentLoaded', function() {
    const closeButton = document.getElementById('closeOnboarding');
    
    if (closeButton) {
        closeButton.addEventListener('click', function() {
            // Close the onboarding tab and mark setup as complete
            chrome.storage.sync.set({ onboardingComplete: true }, function() {
                window.close();
            });
        });
    }
});