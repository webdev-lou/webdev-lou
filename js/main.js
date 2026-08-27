/* ============================================
   Portfolio - Main JavaScript
   Version: 1.0
   ============================================ */

document.addEventListener('DOMContentLoaded', function () {
    // Contact Form Handling
    const contactForm = document.getElementById('contact-form');
    const submitBtn = document.getElementById('submit-btn');
    const formMessage = document.getElementById('form-message');

    // A reCAPTCHA token is single-use and is consumed by the server on every
    // submit, including failed ones. Without this reset, a visitor who hits any
    // error - a validation message, a rate limit - would resubmit the spent
    // token and be told verification failed, with no way out but a page reload.
    function resetCaptcha() {
        if (window.grecaptcha && typeof window.grecaptcha.reset === 'function') {
            try { window.grecaptcha.reset(); } catch (err) { /* widget not rendered yet */ }
        }
    }

    // People type "www.example.com", not "https://www.example.com". The field is
    // type="text" so the browser stops rejecting that, and we add the scheme
    // ourselves. Anything with a non-http(s) scheme (javascript:, data:) has it
    // stripped rather than trusted.
    function normaliseWebsite(value) {
        var v = (value || '').trim();
        if (v === '') return '';
        if (/^https?:\/\//i.test(v)) return v;
        return 'https://' + v.replace(/^[a-z][a-z0-9+.-]*:\/*/i, '');
    }

    var websiteField = document.getElementById('website');
    if (websiteField) {
        websiteField.addEventListener('blur', function () {
            websiteField.value = normaliseWebsite(websiteField.value);
        });
    }

    if (contactForm) {
        contactForm.addEventListener('submit', function (e) {
            e.preventDefault();

            if (websiteField) {
                websiteField.value = normaliseWebsite(websiteField.value);
            }

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
                        resetCaptcha();
                    }
                })
                .catch(function (error) {
                    console.error('Error:', error);
                    formMessage.textContent = 'An error occurred. Please try again later.';
                    formMessage.classList.remove('hidden');
                    formMessage.classList.add('text-red-600');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Send Message';
                    resetCaptcha();
                });
        });
    }
});
