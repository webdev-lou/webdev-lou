/* ============================================
   Portfolio - Main JavaScript
   Version: 1.0
   ============================================ */

document.addEventListener('DOMContentLoaded', function () {
    // Contact Form Handling
    const contactForm = document.getElementById('contact-form');
    const submitBtn = document.getElementById('submit-btn');
    const formMessage = document.getElementById('form-message');

    // Reveal the skills groups when they scroll into view. The hidden state is
    // added here rather than in the stylesheet so that a browser without
    // IntersectionObserver — or with JS off — shows the chips normally instead
    // of leaving them permanently at opacity 0.
    var skillGroups = document.getElementById('skills-groups');
    if (skillGroups && 'IntersectionObserver' in window) {
        skillGroups.classList.add('skills-anim');

        var revealSkills = function () {
            skillGroups.classList.add('skills-visible');
        };

        // Failsafe. Feature-detecting IntersectionObserver covers the case where
        // it is missing, but not the case where it exists and never delivers a
        // callback — some embedded webviews and headless browsers behave exactly
        // that way. Without this the chips would stay at opacity 0 for good.
        // Content must never depend on a decorative trigger firing.
        var skillFailsafe = setTimeout(revealSkills, 3000);

        var skillObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    revealSkills();
                    clearTimeout(skillFailsafe);
                    skillObserver.disconnect();
                }
            });
            // threshold 0, not a fraction: this box is taller than the viewport
            // and grows as chips wrap on narrow screens. A fractional threshold
            // becomes unreachable once the element exceeds 1/threshold viewport
            // heights, and the chips would then stay invisible for good. The
            // negative bottom margin just delays the trigger until it is
            // properly in view rather than clipping the very first pixel.
        }, { threshold: 0, rootMargin: '0px 0px -10% 0px' });
        skillObserver.observe(skillGroups);
    }

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
