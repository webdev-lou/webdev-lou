<?php
header('Content-Type: application/json');

// Prevent direct access
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method Not Allowed"]);
    exit;
}

// Helper to sanitize input
function sanitize_input($data)
{
    return htmlspecialchars(stripslashes(trim($data)));
}

// Strip CR/LF so a value can never inject extra mail headers
function sanitize_header($data)
{
    return trim(str_replace(array("\r", "\n", "%0a", "%0d"), '', $data));
}

// Get and sanitize form data
$name = isset($_POST['name']) ? sanitize_input($_POST['name']) : '';
$email = isset($_POST['email']) ? sanitize_input($_POST['email']) : '';
$phone = isset($_POST['phone']) ? sanitize_input($_POST['phone']) : '';
$website = isset($_POST['website']) ? sanitize_input($_POST['website']) : '';
$message = isset($_POST['message']) ? sanitize_input($_POST['message']) : '';

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

// Log locally
$logEntry = "Time: " . date("Y-m-d H:i:s") . "\n" . $email_content . "---------------------------------\n";
file_put_contents(__DIR__ . "/submissions.txt", $logEntry, FILE_APPEND);

// Build headers from sanitized values only. The From: address stays on our own
// domain so the message passes SPF/DMARC; the visitor's address goes in Reply-To.
$to = "hello@webdev-lou.com";
$safe_name = sanitize_header($name);
$safe_email = sanitize_header($email);
$subject = "New Contact Form Submission from " . $safe_name;
$headers = "From: webdev-lou.com <noreply@webdev-lou.com>\r\n";
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
?>