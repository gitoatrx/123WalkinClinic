<?php
/**
 * Juno EMR settings for online booking.
 *
 * Copy this file to emr-config.php (same folder) and fill it in. emr-config.php
 * holds the clinic's Juno password: never commit it and never put it inside
 * public/ or out/. These are the same values OATRx keeps on the clinic record
 * (juno_base_url, juno_user_name, juno_pass_word, juno_provider_no), except the
 * password is plain text here rather than Laravel-encrypted.
 *
 * The server this runs on must have its IP address whitelisted by Juno.
 */
return [
    // Juno host, no https:// and no path.
    'base_url' => '123-walkin.secure.junoemr.com',
    'user_name' => '',
    'password' => '',

    // Juno provider number recorded as the "creator" of each online booking.
    'creator_provider_no' => '',

    // Only these doctors are offered (Juno providerNo). Empty = every active provider.
    'provider_nos' => [],

    // Only these schedule template codes are bookable online. Empty = all codes.
    'schedule_codes' => [],

    // Appointment status in Juno ("t" = To Do, as OATRx uses).
    'appointment_status' => 't',

    // Shown as the appointment location in Juno.
    'location' => '123 Walk-In Clinic, 108-2777 Gladwin Rd., Abbotsford, BC',

    // How many days ahead patients can book.
    'days_ahead' => 14,

    // Web pages allowed to call the API from a different address (dev server, live site).
    'allowed_origins' => ['http://localhost:3123'],

    // Bookings allowed per visitor IP per hour.
    'bookings_per_hour' => 5,
];
