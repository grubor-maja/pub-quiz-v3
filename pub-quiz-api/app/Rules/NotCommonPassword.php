<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Rejects the passwords every guessing attack tries first. Kept as a local
 * list rather than a breach-database lookup, so registering never depends on
 * a third-party service being up.
 */
class NotCommonPassword implements ValidationRule
{
    private const COMMON = [
        '12345678', '123456789', '1234567890', '87654321', '11111111', '00000000', '12341234',
        '11223344', '12121212', '123123123', '112233445566', '01234567', '99999999', '88888888',
        'password', 'password1', 'password123', 'passw0rd', 'p@ssw0rd', 'p@ssword', 'lozinka', 'lozinka1',
        'lozinka123', 'sifra123', 'sifra1234', 'sifrasifra', 'qwertyui', 'qwertyuiop', 'qwerty123',
        'qwertz123', 'qwertzuiop', 'asdfghjk', 'asdfghjkl', 'zxcvbnm1', '1q2w3e4r', '1qaz2wsx',
        'abcd1234', 'abc12345', 'abcdefgh', 'iloveyou', 'sunshine', 'football', 'baseball',
        'superman', 'princess', 'welcome1', 'admin123', 'administrator', 'letmein1', 'trustno1',
        'starwars', 'whatever', 'internet', 'computer', 'michael1', 'beograd1', 'srbija123',
        'kviz1234', 'pubkviz1', 'koznagde', 'koznagde1', 'koznagde123',
    ];

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $password = mb_strtolower((string) $value);

        $sameChar = preg_match('/^(.)\1*$/u', $password) === 1;

        if ($sameChar || in_array($password, self::COMMON, true)) {
            $fail('Ova lozinka je previše česta i lako se pogađa. Izaberi neku drugu.');
        }
    }
}
