/* ============================================
   Portfolio - Main JavaScript
   Version: 1.0
   ============================================ */

document.addEventListener('DOMContentLoaded', function () {
    // Contact Form Handling
    const contactForm = document.getElementById('contact-form');
    const submitBtn = document.getElementById('submit-btn');
    const formMessage = document.getElementById('form-message');

    if (contactForm) {
        contactForm.addEventListener('submit', function (e) {
            e.preventDefault();

            // Disable button and show loading state
            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending...';
            formMessage.classList.add('hidden');
            formMessage.classList.remove('text-green-600', 'text-red-600');

            const formData = new FormData(contactForm);

            fetch('contact.php', {
                method: 'POST',
                body: formData
            })
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success') {
                        // Replace the button with a thank you message
                        submitBtn.style.display = 'none';
                        formMessage.textContent = '✓ Thank you! Your message has been sent successfully.';
                        formMessage.classList.remove('hidden');
                        formMessage.classList.add('text-green-600');
                        formMessage.style.padding = '16px';
                        formMessage.style.fontSize = '16px';

                        // Disable all form fields
                        contactForm.querySelectorAll('input, textarea').forEach(function (el) {
                            el.disabled = true;
                            el.style.opacity = '0.5';
                        });
                    } else {
                        formMessage.textContent = data.message || 'Something went wrong. Please try again.';
                        formMessage.classList.remove('hidden');
                        formMessage.classList.add('text-red-600');
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Send Message';
                    }
                })
                .catch(function (error) {
                    console.error('Error:', error);
                    formMessage.textContent = 'An error occurred. Please try again later.';
                    formMessage.classList.remove('hidden');
                    formMessage.classList.add('text-red-600');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Send Message';
                });
        });
    }
});
