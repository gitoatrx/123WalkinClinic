<?php
/**
 * Online booking → Juno EMR.
 *
 *   GET  emr.php?action=status                           is Juno set up?
 *   GET  emr.php?action=providers                        doctors that can be booked
 *   GET  emr.php?action=dates&provider=101|any           days with open slots
 *   GET  emr.php?action=times&provider=101|any&date=…    open start times on a day
 *   POST emr.php?action=book  (JSON)                     find / create patient, add appointment
 *
 * Same steps as OATRx's PharmacyEmrBookingController, trimmed to what the website
 * needs. The Juno client and settings live in /server, outside the web root.
 */

declare(strict_types=1);

date_default_timezone_set('America/Vancouver');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

$serverDir = getenv('EMR_SERVER_DIR') ?: dirname(__DIR__, 2) . '/server';
require $serverDir . '/juno.php';
$configFile = getenv('EMR_CONFIG') ?: $serverDir . '/emr-config.php';
$cfg = is_file($configFile) ? require $configFile : null;

// CORS for the dev server / live site, when they are on a different address.
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && in_array($origin, $cfg['allowed_origins'] ?? [], true)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Vary: Origin');
}
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function reply(array $data, int $code = 200): void
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

$action = $_GET['action'] ?? '';
$configured = is_array($cfg) && ($cfg['base_url'] ?? '') !== '' && ($cfg['user_name'] ?? '') !== '' && ($cfg['password'] ?? '') !== '';

if ($action === 'status') reply(['live' => $configured]);
if (!$configured) reply(['error' => 'Online booking is not connected to the clinic’s EMR yet.'], 503);

$juno = new Juno($cfg);
$isDate = fn ($d) => is_string($d) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $d) === 1;

/** Provider numbers to search: one doctor, or every bookable doctor for "any". */
function providerIds(Juno $juno, string $requested): array
{
    $all = array_column($juno->providers(), 'id');
    if ($requested === 'any') return $all;
    if (!in_array($requested, $all, true)) reply(['error' => 'Unknown provider.'], 400);
    return [$requested];
}

/** Open times on a day, merged across providers: [['start' => ISO, 'provider' => id, 'duration' => min], …] */
function openTimes(Juno $juno, array $providerIds, string $date): array
{
    $byStart = [];
    foreach ($providerIds as $id) {
        foreach ($juno->freeSlots($id, $date) as $slot) {
            $byStart[$slot['start']] ??= ['start' => $slot['start'], 'provider' => $id, 'duration' => $slot['duration']];
        }
    }
    ksort($byStart);
    return array_values($byStart);
}

try {
    switch ($action) {
        case 'providers':
            reply(['providers' => $juno->providers()]);

        case 'dates':
            $ids = providerIds($juno, (string) ($_GET['provider'] ?? 'any'));
            $dates = [];
            $now = time();
            for ($i = 0; $i < (int) ($cfg['days_ahead'] ?? 14); $i++) {
                $day = date('Y-m-d', strtotime("+$i day"));
                foreach ($ids as $id) {
                    $future = array_filter($juno->daySchedule($id, $day)['slots'], fn ($s) => strtotime($s['start']) > $now);
                    if ($future) {
                        $dates[] = $day;
                        break;
                    }
                }
            }
            reply(['dates' => $dates]);

        case 'times':
            $date = $_GET['date'] ?? '';
            if (!$isDate($date)) reply(['error' => 'Invalid date.'], 400);
            reply(['times' => openTimes($juno, providerIds($juno, (string) ($_GET['provider'] ?? 'any')), $date)]);

        case 'book':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') reply(['error' => 'Use POST.'], 405);
            book($juno, $cfg, json_decode((string) file_get_contents('php://input'), true) ?: []);

        default:
            reply(['error' => 'Unknown action.'], 400);
    }
} catch (JunoException $e) {
    error_log('[123walkin booking] ' . $e->getMessage());
    reply(['error' => 'We could not reach the clinic’s booking system. Please try again or call the clinic.'] + (!empty($cfg['debug']) ? ['detail' => $e->getMessage()] : []), 502);
}

function book(Juno $juno, array $cfg, array $in): void
{
    // A few bookings per visitor per hour is plenty.
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $rlFile = sys_get_temp_dir() . '/walkin-booking-rl-' . md5($ip) . '.json';
    $hits = array_filter(json_decode((string) @file_get_contents($rlFile), true) ?: [], fn ($t) => $t > time() - 3600);
    if (count($hits) >= (int) ($cfg['bookings_per_hour'] ?? 5)) reply(['error' => 'Too many booking attempts. Please call the clinic.'], 429);

    $str = fn ($k, $max = 100) => mb_substr(trim((string) ($in[$k] ?? '')), 0, $max);
    $p = [
        'phn' => preg_replace('/\D/', '', $str('phn', 20)),
        'dob' => $str('dob', 10),
        'firstName' => $str('firstName', 50),
        'lastName' => $str('lastName', 50),
        'email' => $str('email', 120),
        'cellPhone' => $str('cellPhone', 20),
        'homePhone' => $str('homePhone', 20),
        'sex' => $str('sex', 1),
    ];
    $providerNo = $str('provider', 20);
    $start = $str('start', 40);
    $reason = $str('reason', 50);

    $errors = [];
    if ($p['phn'] !== '' && strlen($p['phn']) !== 10) $errors[] = 'Health Card Number must be 10 digits.';
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $p['dob']) || !checkdate((int) substr($p['dob'], 5, 2), (int) substr($p['dob'], 8, 2), (int) substr($p['dob'], 0, 4))) $errors[] = 'Invalid date of birth.';
    if ($p['firstName'] === '' || $p['lastName'] === '') $errors[] = 'Name is required.';
    if (!filter_var($p['email'], FILTER_VALIDATE_EMAIL)) $errors[] = 'Invalid email address.';
    if (strlen(preg_replace('/\D/', '', $p['cellPhone'] . $p['homePhone'])) < 10) $errors[] = 'A phone number is required.';
    if (!in_array($p['sex'], ['M', 'F', 'O', 'U'], true)) $errors[] = 'Sex is required.';
    if ($reason === '') $errors[] = 'Reason for visit is required.';
    $ts = strtotime($start);
    if ($ts === false) $errors[] = 'Invalid time.';
    if ($errors) reply(['error' => implode(' ', $errors)], 422);

    // The slot must still be open in Juno for this doctor (never trust the browser).
    $slot = null;
    foreach (openTimes($juno, providerIds($juno, $providerNo), date('Y-m-d', $ts)) as $t) {
        if ($t['start'] === $start) $slot = $t;
    }
    if (!$slot) reply(['error' => 'Sorry, that time was just taken. Please choose another time.', 'code' => 'slot_taken'], 409);

    $hits[] = time();
    @file_put_contents($rlFile, json_encode(array_values($hits)), LOCK_EX);

    // Find the patient's chart (health card, else email + birth date), or create one.
    $sameDob = function (array $d) use ($p): bool {
        $dob = sprintf('%04d-%02d-%02d', (int) ($d['yearOfBirth'] ?? 0), (int) ($d['monthOfBirth'] ?? 0), (int) ($d['dateOfBirth'] ?? 0));
        return $dob === $p['dob'];
    };
    $found = $p['phn'] !== '' ? $juno->patientsByPhn($p['phn']) : $juno->patientsByEmailDob($p['email'], $p['dob']);
    $patient = null;
    foreach ($found as $d) {
        if (!empty($d['demographicNo']) && $sameDob($d)) {
            $patient = $d;
            break;
        }
    }
    if (!$patient && $found && $p['phn'] !== '') {
        reply(['error' => 'The date of birth does not match the clinic’s record for this health card. Please check it, or call the clinic.'], 422);
    }

    $serverTime = $juno->serverTime();
    if ($patient) {
        $demographicNo = (string) $patient['demographicNo'];
        $name = is_string($patient['displayName'] ?? null) ? $patient['displayName'] : $p['lastName'] . ', ' . $p['firstName'];
    } else {
        $demographicNo = $juno->addPatient($p, $serverTime);
        $name = $p['lastName'] . ', ' . $p['firstName'];
    }

    // End = start + the schedule's slot length, keeping Juno's time-zone offset.
    $startDt = new DateTimeImmutable($start);
    $end = $startDt->modify('+' . $slot['duration'] . ' minutes')->format('Y-m-d\TH:i:sP');

    $notes = array_filter([
        'Booked online (123walkin website)',
        $str('method', 30),
        $str('formNote', 60) !== '' && stripos($str('formNote', 60), 'yes') === 0 ? $str('formNote', 60) : '',
        $str('pharmacy', 120) !== '' ? 'Pharmacy: ' . $str('pharmacy', 120) . ($str('delivery', 10) === 'delivery' ? ' (delivery)' : ' (pick up)') : '',
        $str('notes', 500),
    ]);

    $appointmentId = $juno->addAppointment([
        'start' => $start,
        'end' => $end,
        'serverTime' => $serverTime,
        'demographicNo' => $demographicNo,
        'name' => $name,
        'providerNo' => $slot['provider'],
        'reason' => $reason,
        'notes' => implode(' – ', $notes),
    ]);

    $providerName = '';
    foreach ($juno->providers() as $pr) {
        if ($pr['id'] === $slot['provider']) $providerName = $pr['name'];
    }
    reply(['ok' => true, 'appointmentId' => $appointmentId, 'provider' => $providerName, 'start' => $start, 'end' => $end]);
}
