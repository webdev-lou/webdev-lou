<?php
/**
 * reCAPTCHA configuration TEMPLATE.
 *
 * This file is a template only and holds no real secret. Copy it to:
 *
 *     <one level ABOVE public_html>/private/recaptcha_config.php
 *
 * e.g. on Hostinger:  /home/uXXXXXXXX/domains/webdev-lou.com/private/recaptcha_config.php
 *
 * Why outside public_html: the secret key must never be reachable over HTTP,
 * and must never be committed - this repository is PUBLIC on GitHub. Keeping it
 * above the web root means no .htaccess rule stands between it and the internet.
 *
 * The SITE key is public and belongs in index.html (data-sitekey).
 * The SECRET key is server-side only and belongs here. Never swap them.
 *
 * Get both from https://www.google.com/recaptcha/admin
 * Type to choose: reCAPTCHA v2 -> "I'm not a robot" Checkbox.
 * Restrict the key to your domains (webdev-lou.com) in the admin console so a
 * token minted on someone else's site cannot be replayed against this form.
 */

// Refuse to be served directly, in case it ever ends up somewhere web-reachable.
if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === basename(__FILE__)) {
    http_response_code(403);
    exit('Access denied.');
}

return [
    'secret_key' => 'PASTE_YOUR_RECAPTCHA_SECRET_KEY_HERE',
];
