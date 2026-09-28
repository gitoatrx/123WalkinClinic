<?php
/**
 * Minimal Juno EMR (OSCAR) SOAP client for online booking.
 *
 * Only the calls the booking flow needs, taken from OATRx's JunoApiTrait:
 * login, providers, day schedule, booked appointments, server time, find /
 * create patient and add appointment. Unlike the OATRx version every value
 * placed into the XML is escaped, because here it comes from the public form.
 *
 * Juno only answers servers whose IP address it has whitelisted; from any
 * other IP every call fails with "Unauthorized IP Address".
 */

final class JunoException extends RuntimeException {}

final class Juno
{
    private array $cfg;
    private ?array $token = null;

    public function __construct(array $cfg)
    {
        $this->cfg = $cfg;
    }

    // ---------------------------------------------------------------- calls

    /** Active providers: [['id' => '101', 'name' => 'Dr. Jane Smith'], …] */
    public function providers(): array
    {
        $rows = $this->rows($this->call('ProviderService', '<ins0:getProviders><arg0>1</arg0></ins0:getProviders>', 'getProvidersResponse'));
        $allow = array_map('strval', $this->cfg['provider_nos'] ?? []);
        $out = [];
        foreach ($rows as $p) {
            $no = $this->scalar($p['providerNo'] ?? '');
            if ((int) $no < 1 || ($allow && !in_array($no, $allow, true))) continue;
            $name = trim($this->scalar($p['firstName'] ?? '') . ' ' . $this->scalar($p['lastName'] ?? ''));
            $out[] = ['id' => $no, 'name' => $name !== '' ? $name : "Provider $no"];
        }
        return $out;
    }

    /** Juno's working slots for one provider and day: ['duration' => 15, 'slots' => [['start' => ISO, 'code' => '1'], …]] */
    public function daySchedule(string $providerNo, string $date): array
    {
        $key = "sched_{$providerNo}_{$date}";
        if ($hit = $this->cacheGet($key, 600)) return $hit;

        $r = $this->call('ScheduleService', '<ins0:getDayWorkSchedule><arg0>' . $this->x($providerNo) . '</arg0><arg1>' . $this->x($date) . '</arg1></ins0:getDayWorkSchedule>', 'getDayWorkScheduleResponse');
        $result = ['duration' => 15, 'slots' => []];
        if (is_array($r) && ($r['holiday'] ?? 'false') === 'false') {
            $result['duration'] = max(5, (int) ($r['timeSlotDurationMin'] ?? 15));
            $codes = array_map('strval', $this->cfg['schedule_codes'] ?? []);
            foreach ($this->rows($r['timeSlots'] ?? []) as $slot) {
                $code = $this->scalar($slot['scheduleCode'] ?? '');
                $start = $this->scalar($slot['date'] ?? '');
                if ($start === '' || ($codes && !in_array($code, $codes, true))) continue;
                $result['slots'][] = ['start' => $start, 'code' => $code];
            }
        }
        $this->cachePut($key, $result);
        return $result;
    }

    /** Start times already booked for a provider on a day. */
    public function bookedStarts(string $providerNo, string $date): array
    {
        $r = $this->call('ScheduleService', '<ins0:getAppointmentsForProvider><arg0>' . $this->x($providerNo) . '</arg0><arg1>' . $this->x($date) . '</arg1></ins0:getAppointmentsForProvider>', 'getAppointmentsForProviderResponse');
        $starts = [];
        foreach ($this->rows($r) as $a) {
            $s = $this->scalar($a['appointmentStartDateTime'] ?? '');
            if ($s !== '') $starts[] = $s;
        }
        return $starts;
    }

    /** Open (not booked, not past) start times for a provider on a day. */
    public function freeSlots(string $providerNo, string $date): array
    {
        $sched = $this->daySchedule($providerNo, $date);
        if (!$sched['slots']) return [];
        $booked = array_flip($this->bookedStarts($providerNo, $date));
        $now = time();
        $free = [];
        foreach ($sched['slots'] as $slot) {
            if (isset($booked[$slot['start']])) continue;
            $ts = strtotime($slot['start']);
            if ($ts === false || $ts <= $now) continue;
            $free[] = ['start' => $slot['start'], 'duration' => $sched['duration']];
        }
        return $free;
    }

    public function serverTime(): string
    {
        return $this->scalar($this->call('SystemInfoService', '<ins0:getServerTime></ins0:getServerTime>', 'getServerTimeResponse'));
    }

    /** Patients with this health card number (PHN). */
    public function patientsByPhn(string $phn): array
    {
        $r = $this->call('DemographicService', '<ins0:getDemographicsByHealthNum><arg0>' . $this->x($phn) . '</arg0></ins0:getDemographicsByHealthNum>', 'getDemographicsByHealthNumResponse');
        return $this->rows($r);
    }

    /** Patients matching email + date of birth (YYYY-MM-DD). */
    public function patientsByEmailDob(string $email, string $dob): array
    {
        $r = $this->call('DemographicService', '<ins0:searchDemographicsByAttributes><arg4>' . $this->x($dob) . '</arg4><arg8>' . $this->x($email) . '</arg8><arg11>1</arg11></ins0:searchDemographicsByAttributes>', 'searchDemographicsByAttributesResponse');
        return $this->rows($r);
    }

    /** Creates a patient chart and returns its demographicNo. */
    public function addPatient(array $p, string $serverTime): string
    {
        [$y, $m, $d] = explode('-', $p['dob']);
        $sexNames = ['M' => 'Male', 'F' => 'Female', 'O' => 'Other', 'U' => 'Undefined'];
        $f = [
            'address' => '', 'cellPhone' => $p['cellPhone'], 'city' => '', 'dateJoined' => $serverTime,
            'displayName' => $p['lastName'] . ', ' . $p['firstName'], 'dateOfBirth' => $d, 'email' => $p['email'],
            'firstName' => $p['firstName'], 'hcType' => $p['phn'] !== '' ? 'BC' : '', 'hin' => $p['phn'],
            'lastName' => $p['lastName'], 'lastUpdateDate' => $serverTime, 'monthOfBirth' => $m,
            'notes' => 'Added by online booking (123walkin website)', 'patientStatus' => 'AC',
            'patientStatusDate' => $serverTime, 'phone' => $p['homePhone'], 'province' => 'BC',
            'sex' => $p['sex'], 'sexDesc' => $sexNames[$p['sex']] ?? '', 'yearOfBirth' => $y,
        ];
        $xml = '';
        foreach ($f as $tag => $value) $xml .= "<$tag>" . $this->x($value) . "</$tag>";
        $no = $this->scalar($this->call('DemographicService', "<ins0:addDemographic><arg0>$xml</arg0></ins0:addDemographic>", 'addDemographicResponse'));
        if ((int) $no < 1) throw new JunoException('Juno did not return the new patient number.');
        return $no;
    }

    /** Adds the appointment to the provider's schedule; returns Juno's appointment id. */
    public function addAppointment(array $a): string
    {
        $t = $a['serverTime'];
        $notes = mb_substr(str_replace(["\r", "\n"], ' ', $a['notes']), 0, 240);
        $f = [
            'appointmentEndDateTime' => $a['end'], 'appointmentStartDateTime' => $a['start'],
            'createDateTime' => $t, 'creator' => $this->cfg['creator_provider_no'] ?? '', 'currentClinicTime' => $t,
            'demographicNo' => $a['demographicNo'], 'isVirtual' => 'false', 'location' => $this->cfg['location'] ?? '',
            'name' => $a['name'], 'notes' => $notes, 'programId' => '0', 'providerNo' => $a['providerNo'],
            'reason' => mb_substr($a['reason'], 0, 80), 'status' => $this->cfg['appointment_status'] ?? 't',
            'updateDateTime' => $t, 'virtualAppointmentType' => 'NONE',
        ];
        $xml = '';
        foreach ($f as $tag => $value) $xml .= "<$tag>" . $this->x($value) . "</$tag>";
        $id = $this->scalar($this->call('ScheduleService', "<ins0:addAppointment><arg0>$xml</arg0></ins0:addAppointment>", 'addAppointmentResponse'));
        if ($id === '') throw new JunoException('Juno did not confirm the appointment.');
        return $id;
    }

    // ------------------------------------------------------------ plumbing

    /** LoginService → securityId + securityTokenKey, reused for 110 minutes. */
    private function login(): array
    {
        if ($this->token) return $this->token;
        if ($hit = $this->cacheGet('login', 110 * 60)) return $this->token = $hit;

        $body = '<ins0:login><arg0>' . $this->x($this->cfg['user_name']) . '</arg0><arg1>' . $this->x($this->cfg['password']) . '</arg1></ins0:login>';
        $r = $this->post('LoginService', $this->envelope('', $body), 'loginResponse');
        if (empty($r['securityId']) || empty($r['securityTokenKey'])) throw new JunoException('Juno login failed.');
        $this->token = ['id' => (string) $r['securityId'], 'key' => (string) $r['securityTokenKey']];
        $this->cachePut('login', $this->token);
        return $this->token;
    }

    private function call(string $service, string $body, string $responseTag, bool $retry = true)
    {
        try {
            return $this->callOnce($service, $body, $responseTag);
        } catch (JunoException $e) {
            if (!$retry) throw $e;
            // The cached login may have expired on Juno's side: log in again once.
            $this->token = null;
            @unlink($this->cacheFile('login'));
            return $this->callOnce($service, $body, $responseTag);
        }
    }

    private function callOnce(string $service, string $body, string $responseTag)
    {
        $t = $this->login();
        $header = '<wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd"><wsse:UsernameToken wsu:Id="UsernameToken-1" xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd"><wsse:Username>' . $this->x($t['id']) . '</wsse:Username><wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">' . $this->x($t['key']) . '</wsse:Password></wsse:UsernameToken></wsse:Security>';
        return $this->post($service, $this->envelope($header, $body), $responseTag);
    }

    private function envelope(string $header, string $body): string
    {
        return '<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:tns="http://ws.oscarehr.org/" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ins0="http://v1.soap.external.ws.oscarehr.org/"><soapenv:Header>' . $header . '</soapenv:Header><soapenv:Body>' . $body . '</soapenv:Body></soapenv:Envelope>';
    }

    private function post(string $service, string $xml, string $responseTag)
    {
        $host = $this->cfg['base_url'];
        $ch = curl_init((preg_match('~^https?://~', $host) ? rtrim($host, '/') : "https://$host") . '/juno/ws/' . $service);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $xml,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_HTTPHEADER => ['Content-Type: text/xml; charset=utf-8', 'Accept: text/xml'],
        ]);
        $response = curl_exec($ch);
        $error = curl_error($ch);
        curl_close($ch);
        if ($response === false || $response === '') throw new JunoException("Could not reach Juno ($service): $error");

        // Same trick as OATRx: drop the namespace colons so SimpleXML can read it.
        $flat = preg_replace('/(<\/?)(\w+):([^>]*>)/', '$1$2$3', $response);
        libxml_use_internal_errors(true);
        $doc = simplexml_load_string($flat);
        if ($doc === false || !isset($doc->soapBody)) throw new JunoException("Unreadable answer from Juno ($service).");
        $body = json_decode(json_encode($doc->soapBody), true);
        if (isset($body['soapFault'])) {
            $msg = is_string($body['soapFault']['faultstring'] ?? null) ? $body['soapFault']['faultstring'] : 'SOAP fault';
            throw new JunoException("Juno refused $service: $msg");
        }
        return $body['ns2' . $responseTag]['return'] ?? null;
    }

    /** SimpleXML turns one row into an object and many into a list; always return a list. */
    private function rows($r): array
    {
        if (!is_array($r) || !$r) return [];
        return array_is_list($r) ? array_values(array_filter($r, 'is_array')) : [$r];
    }

    private function scalar($v): string
    {
        return is_array($v) ? '' : trim((string) $v);
    }

    private function x($v): string
    {
        return htmlspecialchars((string) $v, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    }

    private function cacheFile(string $key): string
    {
        return sys_get_temp_dir() . '/walkin-juno-' . md5($this->cfg['base_url'] . '|' . $key) . '.json';
    }

    private function cacheGet(string $key, int $ttl): ?array
    {
        $file = $this->cacheFile($key);
        if (!is_file($file) || filemtime($file) < time() - $ttl) return null;
        $data = json_decode((string) file_get_contents($file), true);
        return is_array($data) ? $data : null;
    }

    private function cachePut(string $key, array $data): void
    {
        @file_put_contents($this->cacheFile($key), json_encode($data), LOCK_EX);
    }
}
