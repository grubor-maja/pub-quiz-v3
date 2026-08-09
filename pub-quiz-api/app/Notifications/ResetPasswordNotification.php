<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Notifications\Messages\MailMessage;

class ResetPasswordNotification extends ResetPassword
{
    public function toMail($notifiable): MailMessage
    {
        $frontendUrl = config('app.frontend_url', 'http://localhost:5173');
        $url = $frontendUrl.'/reset-password?token='.$this->token.'&email='.urlencode($notifiable->getEmailForPasswordReset());

        return (new MailMessage)
            ->subject('Resetovanje lozinke - Ko Zna Zna')
            ->greeting('Zdravo!')
            ->line('Dobili ste ovaj email jer je zatraženo resetovanje lozinke za vaš nalog.')
            ->action('Resetuj lozinku', $url)
            ->line('Link vazi 60 minuta.')
            ->line('Ako niste zatrazili resetovanje lozinke, ignorisite ovaj email.')
            ->salutation('Ko Zna Zna tim');
    }
}
