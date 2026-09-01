/* ============================================
   Portfolio - Main JavaScript
   Version: 1.0
   ============================================ */

document.addEventListener('DOMContentLoaded', function () {
    // Contact Form Handling
    const contactForm = document.getElementById('contact-form');
    const submitBtn = document.getElementById('submit-btn');
    const formMessage = document.getElementById('form-message');

    // ---------------------------------------------------------------------
    // Skills graph
    //
    // A hand-written force simulation rather than d3 or cytoscape: those are
    // 270-400KB, and a CDN copy would be refused outright by this site's CSP
    // (script-src 'self' plus a short allowlist). 56 nodes is small enough that
    // naive O(n^2) repulsion is nothing.
    //
    // Nodes are read out of the List panel, so the two views cannot disagree.
    // ---------------------------------------------------------------------
    (function () {
        var svg = document.getElementById('skills-graph');
        var graphPanel = document.getElementById('skills-panel-graph');
        var listPanel = document.getElementById('skills-panel-list');
        var tabGraph = document.getElementById('skills-tab-graph');
        var tabList = document.getElementById('skills-tab-list');
        if (!svg || !graphPanel || !listPanel || !tabGraph || !tabList) return;

        var NS = 'http://www.w3.org/2000/svg';
        var W = 820, H = 600, CX = W / 2, CY = H / 2;

        // --- read the list -------------------------------------------------
        var nodes = [], links = [];
        var center = { id: 'root', label: 'Skills', kind: 'root', r: 13, x: CX, y: CY, vx: 0, vy: 0 };
        nodes.push(center);

        var rows = listPanel.querySelectorAll('.skill-group');
        var cats = [];
        Array.prototype.forEach.call(rows, function (row, ci) {
            var ps = row.querySelectorAll('p');
            if (ps.length < 2) return;
            var catLabel = ps[0].textContent.trim();
            // Items are the text nodes between the middot spans.
            var items = Array.prototype.filter.call(ps[1].childNodes, function (n) {
                return n.nodeType === 3 && n.textContent.trim();
            }).map(function (n) { return n.textContent.trim(); });
            if (!items.length) return;

            var a = (ci / rows.length) * Math.PI * 2;
            var cat = {
                id: 'c' + ci, label: catLabel, kind: 'cat', r: 8, group: ci,
                x: CX + Math.cos(a) * 200, y: CY + Math.sin(a) * 175, vx: 0, vy: 0
            };
            nodes.push(cat); cats.push(cat);
            links.push({ a: center, b: cat, len: 200 });

            items.forEach(function (label, si) {
                var sa = a + (si - (items.length - 1) / 2) * 0.34;
                nodes.push({
                    id: 'c' + ci + 's' + si, label: label, kind: 'skill', r: 4.2, group: ci,
                    x: cat.x + Math.cos(sa) * 74, y: cat.y + Math.sin(sa) * 74, vx: 0, vy: 0
                });
                links.push({ a: cat, b: nodes[nodes.length - 1], len: 74 });
            });
        });
        if (cats.length === 0) return;

        // --- build svg -----------------------------------------------------
        var gLinks = document.createElementNS(NS, 'g');
        var gNodes = document.createElementNS(NS, 'g');
        svg.appendChild(gLinks); svg.appendChild(gNodes);

        links.forEach(function (l) {
            l.el = document.createElementNS(NS, 'line');
            l.el.setAttribute('class', 'sg-link');
            gLinks.appendChild(l.el);
        });

        nodes.forEach(function (n) {
            var g = document.createElementNS(NS, 'g');
            g.setAttribute('class', 'sg-node sg-node--' + n.kind);
            var c = document.createElementNS(NS, 'circle');
            c.setAttribute('r', n.r);
            var t = document.createElementNS(NS, 'text');
            t.setAttribute('class', 'sg-label');
            t.setAttribute('text-anchor', 'middle');
            t.setAttribute('dy', -n.r - 5);
            t.textContent = n.label;
            g.appendChild(c); g.appendChild(t);
            gNodes.appendChild(g);
            n.el = g;

            g.addEventListener('mouseenter', function () { setActive(n); });
            g.addEventListener('mouseleave', function () { setActive(null); });
        });

        function setActive(node) {
            svg.classList.toggle('sg-has-active', !!node);
            nodes.forEach(function (n) {
                var on = !node || n === node ||
                    (node.kind !== 'root' && n.group === node.group && n.kind !== 'root') ||
                    (n.kind === 'root' && node.kind === 'cat');
                n.el.classList.toggle('is-dim', !!node && !on);
                n.el.classList.toggle('is-active', node === n);
                // Drive the label directly off a class on the node. Relying on an
                // ancestor .sg-has-active rule to out-specify the resting
                // "hidden" rule proved unreliable; one class, one rule is
                // predictable.
                n.el.classList.toggle('show-label', !!node && on && n.kind === 'skill');
            });
            links.forEach(function (l) {
                var on = !node || l.a === node || l.b === node ||
                    (node.kind === 'cat' && (l.a.group === node.group || l.b.group === node.group));
                l.el.classList.toggle('is-dim', !!node && !on);
            });
        }

        // --- simulation ----------------------------------------------------
        var REP = 3300, SPRING = 0.05, GRAVITY = 0.010, DAMP = 0.85;

        function tick() {
            var i, j, a, b, dx, dy, d2, d, f;
            for (i = 0; i < nodes.length; i++) {
                for (j = i + 1; j < nodes.length; j++) {
                    a = nodes[i]; b = nodes[j];
                    dx = b.x - a.x; dy = b.y - a.y;
                    d2 = dx * dx + dy * dy || 0.01;
                    if (d2 > 90000) continue;          // ignore distant pairs
                    d = Math.sqrt(d2);
                    f = REP / d2;
                    dx /= d; dy /= d;
                    a.vx -= dx * f; a.vy -= dy * f;
                    b.vx += dx * f; b.vy += dy * f;
                }
            }
            links.forEach(function (l) {
                dx = l.b.x - l.a.x; dy = l.b.y - l.a.y;
                d = Math.sqrt(dx * dx + dy * dy) || 0.01;
                f = (d - l.len) * SPRING;
                dx = dx / d * f; dy = dy / d * f;
                l.a.vx += dx; l.a.vy += dy;
                l.b.vx -= dx; l.b.vy -= dy;
            });
            var moved = 0;
            nodes.forEach(function (n) {
                if (n === dragging) return;
                n.vx += (CX - n.x) * GRAVITY;
                n.vy += (CY - n.y) * GRAVITY;
                n.vx *= DAMP; n.vy *= DAMP;
                n.x += n.vx; n.y += n.vy;
                // keep everything inside the viewBox
                var m = n.r + 46;
                n.x = Math.max(m, Math.min(W - m, n.x));
                n.y = Math.max(m + 6, Math.min(H - m, n.y));
                moved += Math.abs(n.vx) + Math.abs(n.vy);
            });
            return moved;
        }

        function draw() {
            nodes.forEach(function (n) {
                n.el.setAttribute('transform', 'translate(' + n.x.toFixed(1) + ',' + n.y.toFixed(1) + ')');
            });
            links.forEach(function (l) {
                l.el.setAttribute('x1', l.a.x.toFixed(1)); l.el.setAttribute('y1', l.a.y.toFixed(1));
                l.el.setAttribute('x2', l.b.x.toFixed(1)); l.el.setAttribute('y2', l.b.y.toFixed(1));
            });
        }

        var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var raf = null, dragging = null;

        function run() {
            if (raf) return;
            (function loop() {
                var moved = tick();
                draw();
                // Stop once it settles. An always-on rAF loop would burn battery
                // for a decoration that has stopped moving.
                if (moved < 0.6 && !dragging) { raf = null; return; }
                raf = requestAnimationFrame(loop);
            })();
        }

        function settle(n) { for (var i = 0; i < n; i++) tick(); draw(); }

        // --- drag ----------------------------------------------------------
        svg.addEventListener('pointerdown', function (e) {
            var g = e.target.closest && e.target.closest('.sg-node');
            if (!g) return;
            dragging = nodes.filter(function (n) { return n.el === g; })[0] || null;
            if (dragging) { svg.setPointerCapture(e.pointerId); run(); }
        });
        svg.addEventListener('pointermove', function (e) {
            if (!dragging) return;
            var r = svg.getBoundingClientRect();
            dragging.x = (e.clientX - r.left) / r.width * W;
            dragging.y = (e.clientY - r.top) / r.height * H;
            dragging.vx = dragging.vy = 0;
            draw();
        });
        function endDrag(e) {
            if (!dragging) return;
            dragging = null;
            try { svg.releasePointerCapture(e.pointerId); } catch (err) { }
            run();
        }
        svg.addEventListener('pointerup', endDrag);
        svg.addEventListener('pointercancel', endDrag);

        // --- tabs ----------------------------------------------------------
        var started = false;
        function show(which) {
            var g = which === 'graph';
            graphPanel.hidden = !g;
            listPanel.hidden = g;
            tabGraph.setAttribute('aria-selected', String(g));
            tabList.setAttribute('aria-selected', String(!g));
            tabGraph.classList.toggle('is-on', g);
            tabList.classList.toggle('is-on', !g);
            if (g && !started) {
                started = true;
                // Pre-settle so it opens on a formed graph rather than a
                // starburst that visibly untangles itself.
                settle(reduce ? 400 : 120);
                if (!reduce) run();
            }
        }
        tabGraph.addEventListener('click', function () { show('graph'); });
        tabList.addEventListener('click', function () { show('list'); });

        // Only now reveal the toggle: without JS the list stands on its own and
        // a Graph tab that does nothing would be worse than no tab at all.
        document.getElementById('skills-views').classList.add('skills-views--ready');
        show('graph');
    })();

    // Experience slider. Scrolling itself is native overflow-x, so touch,
    // trackpad and keyboard already work; these buttons only add a visible
    // affordance for mouse users, and disable themselves at each end.
    var expTrack = document.getElementById('exp-track');
    var expPrev = document.getElementById('exp-prev');
    var expNext = document.getElementById('exp-next');

    if (expTrack && expPrev && expNext) {
        var reduceMotion = window.matchMedia
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        var expStep = function () {
            var card = expTrack.querySelector('article');
            // card width + the flex gap, so one click advances exactly one card
            return card ? card.getBoundingClientRect().width + 24 : 320;
        };

        var syncExpButtons = function () {
            // 2px tolerance: scrollLeft can land on a fractional pixel and never
            // exactly equal the maximum, which would leave "next" enabled at the end.
            var max = expTrack.scrollWidth - expTrack.clientWidth;
            expPrev.disabled = expTrack.scrollLeft <= 2;
            expNext.disabled = expTrack.scrollLeft >= max - 2;
        };

        var expScroll = function (dir) {
            expTrack.scrollBy({
                left: dir * expStep(),
                behavior: reduceMotion ? 'auto' : 'smooth'
            });
        };

        expPrev.addEventListener('click', function () { expScroll(-1); });
        expNext.addEventListener('click', function () { expScroll(1); });
        expTrack.addEventListener('scroll', syncExpButtons, { passive: true });
        window.addEventListener('resize', syncExpButtons);
        syncExpButtons();
    }

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
