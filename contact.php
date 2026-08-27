<?php
header('Content-Type: application/json');

// Prevent direct access
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method Not Allowed"]);
    exit;
}

/**
 * Gate order is cheapest-first, so an obvious bot costs us nothing:
 * method check -> honeypot (array read) -> rate limit (file I/O) -> validation -> mail -> log.
 * The honeypot runs before the rate limiter on purpose: bots that fall for it
 * never consume a rate-limit slot, leaving the whole budget for real visitors.
 */

// --- Honeypot ---------------------------------------------------------------
// NOTE: this cannot be named "website" - that is a real, visible field on this
// form, and using it would reject every visitor who fills their site in.
// Answer 200 rather than an error: an error tells the operator the trap exists.
if (!empty($_POST['company'])) {
    echo json_encode(["status" => "success", "message" => "Thank you! Your message has been sent."]);
    exit;
}

// Private storage lives OUTSIDE the web root, so no .htaccess rule stands
// between the contact log and the public internet.
$private_dir = dirname(__DIR__) . "/private";
if (!is_dir($private_dir)) {
    @mkdir($private_dir, 0700, true);
}
$storage_ok = is_dir($private_dir) && is_writable($private_dir);

// --- Rate limiting ----------------------------------------------------------
// Behind Cloudflare, REMOTE_ADDR is Cloudflare's edge IP, so every visitor on
// earth would share a single bucket. CF-Connecting-IP carries the real client.
$client_ip = $_SERVER['HTTP_CF_CONNECTING_IP']
    ?? $_SERVER['REMOTE_ADDR']
    ?? 'unknown';

if ($storage_ok) {
    $rate_file = $private_dir . "/rate_" . md5($client_ip) . ".json";
    $max = 8;
    $window = 3600;
    $rate = file_exists($rate_file) ? json_decode(file_get_contents($rate_file), true) : null;

    if ($rate && $rate['expires'] > time() && $rate['count'] >= $max) {
        http_response_code(429);
        echo json_encode(["status" => "error", "message" => "Too many messages sent. Please try again later."]);
        exit;
    }
    if (!$rate || $rate['expires'] <= time()) {
        $rate = ['count' => 0, 'expires' => time() + $window];
    }
    $rate['count']++;
    file_put_contents($rate_file, json_encode($rate), LOCK_EX);
}

// --- reCAPTCHA v2 (checkbox) ------------------------------------------------
// Runs after the local gates on purpose: a bot that trips the honeypot or the
// rate limit is rejected without costing us a call to Google.
//
// The secret key is loaded from OUTSIDE the web root. It must never sit in the
// repository - this one is public on GitHub - nor anywhere URL-reachable.
$recaptcha_config = $private_dir . "/recaptcha_config.php";
$recaptcha_secret = '';
if (is_readable($recaptcha_config)) {
    $cfg = require $recaptcha_config;
    if (is_array($cfg) && !empty($cfg['secret_key'])) {
        $recaptcha_secret = $cfg['secret_key'];
    }
}

// Fail CLOSED. A missing config or an unreachable Google must reject the
// submission, never wave it through.
if ($recaptcha_secret === '' || !function_exists('curl_init')) {
    error_log("contact.php: reCAPTCHA not configured (missing secret or curl) - rejecting");
    http_response_code(503);
    echo json_encode(["status" => "error", "message" => "We couldn't verify your submission right now. Please email hello@webdev-lou.com directly."]);
    exit;
}

$recaptcha_token = $_POST['g-recaptcha-response'] ?? '';
if ($recaptcha_token === '') {
    http_response_code(403);
    echo json_encode(["status" => "error", "message" => "Please confirm you're not a robot."]);
    exit;
}

$ch = curl_init('https://www.google.com/recaptcha/api/siteverify');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => http_build_query([
        'secret'   => $recaptcha_secret,
        'response' => $recaptcha_token,
        'remoteip' => $client_ip,
    ]),
    CURLOPT_TIMEOUT        => 10,
    CURLOPT_SSL_VERIFYPEER => true,   // never disable
]);
$recaptcha_body = curl_exec($ch);
$recaptcha_status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
// No curl_close(): a no-op since PHP 8.0 and deprecated in 8.5, where its
// notice can print before our JSON and corrupt the response the front end parses.

if ($recaptcha_body === false || $recaptcha_status !== 200) {
    error_log("contact.php: reCAPTCHA verify unreachable (HTTP $recaptcha_status)");
    http_response_code(503);
    echo json_encode(["status" => "error", "message" => "We couldn't verify your submission right now. Please try again shortly."]);
    exit;
}

$recaptcha_data = json_decode($recaptcha_body, true);

// v2 checkbox returns a plain boolean "success" and NO score. Do not read
// $data['score'] here: v3 and Enterprise keys behave differently, and an
// absent score defaulting to 0 silently rejects every genuine visitor.
if (!is_array($recaptcha_data) || empty($recaptcha_data['success'])) {
    http_response_code(403);
    echo json_encode(["status" => "error", "message" => "Verification failed. Please tick the box and try again."]);
    exit;
}

// --- Input ------------------------------------------------------------------
// Trim and length-cap only. These values go into a text/plain email and a text
// log, so HTML-escaping here would corrupt legitimate input ("O'Brien" would
// arrive as "O&#039;Brien"). Escape at the point of output, not on the way in.
function clean_field($data, $max = 255)
{
    return mb_substr(trim((string) $data), 0, $max);
}

// Strip CR/LF so a value can never inject extra mail headers
function sanitize_header($data)
{
    return trim(str_replace(array("\r", "\n", "%0a", "%0d"), '', $data));
}

// Collapse newlines so a value cannot forge extra lines in the log
function sanitize_log($data)
{
    return str_replace(array("\r", "\n"), ' ', $data);
}

$name    = clean_field($_POST['name']    ?? '');
$email   = clean_field($_POST['email']   ?? '');
$phone   = clean_field($_POST['phone']   ?? '');
$website = clean_field($_POST['website'] ?? '');
$message = clean_field($_POST['message'] ?? '', 5000);

// Validate required fields
if (empty($name) || empty($email) || empty($message)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Please fill in all required fields."]);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Please enter a valid email address."]);
    exit;
}

// Prepare email content
$email_content = "Name: $name\n";
$email_content .= "Email: $email\n";
$email_content .= "Phone: $phone\n";
$email_content .= "Website: $website\n\n";
$email_content .= "Message:\n$message\n";

// Log outside the web root. Every field is newline-stripped first so a crafted
// message cannot forge separator lines or fake entries.
if ($storage_ok) {
    $logEntry = "Time: " . date("Y-m-d H:i:s") . "\n"
        . "IP: " . sanitize_log($client_ip) . "\n"
        . "Name: " . sanitize_log($name) . "\n"
        . "Email: " . sanitize_log($email) . "\n"
        . "Phone: " . sanitize_log($phone) . "\n"
        . "Website: " . sanitize_log($website) . "\n"
        . "Message: " . sanitize_log($message) . "\n"
        . "---------------------------------\n";
    file_put_contents($private_dir . "/submissions.txt", $logEntry, FILE_APPEND | LOCK_EX);
} else {
    // Never fall back to writing inside the web root - losing the log entry is
    // preferable to publishing someone's contact details.
    error_log("contact.php: private storage unwritable, submission not logged");
}

// Build headers from sanitized values only. The From: address stays on our own
// domain so the message passes SPF/DMARC; the visitor's address goes in Reply-To.
$to = "hello@webdev-lou.com";
$safe_name = sanitize_header($name);
$safe_email = sanitize_header($email);
$subject = "New Contact Form Submission from " . $safe_name;
$headers = "From: webdev-lou.com <hello@webdev-lou.com>\r\n";
$headers .= "Reply-To: $safe_name <$safe_email>\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8";

// Suppress warnings on localhost where mail() isn't configured, but keep the result.
$sent = @mail($to, $subject, $email_content, $headers);

if ($sent) {
    echo json_encode(["status" => "success", "message" => "Thank you! Your message has been sent."]);
} else {
    // The submission is logged, so nothing is lost - but don't claim it was delivered.
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "We couldn't send your message right now. Please email hello@webdev-lou.com directly."
    ]);
}
