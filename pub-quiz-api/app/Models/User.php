<?php

namespace App\Models;

use App\Notifications\ResetPasswordNotification;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    // is_admin is intentionally absent: mass assignment is how a registration
    // payload would be able to grant itself the flag.
    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_admin' => 'boolean',
        ];
    }

    public function isAdmin(): bool
    {
        return (bool) $this->is_admin;
    }

    /** Organizations this user administers, granted by a site admin. */
    public function managedOrganizations(): BelongsToMany
    {
        return $this->belongsToMany(Organization::class, 'organization_user', 'user_id', 'organization_id')
            ->withTimestamps();
    }

    /** May open the admin panels at all: a site admin, or admin of some organization. */
    public function canManageAnything(): bool
    {
        return $this->isAdmin() || $this->managedOrganizations()->exists();
    }

    /**
     * Ids of the organizations this user may manage, or null for "all of them".
     * Every scoped admin query goes through this, so a missing check fails
     * closed: an organization admin with no organizations sees nothing.
     *
     * @return array<int, string>|null
     */
    public function manageableOrganizationIds(): ?array
    {
        if ($this->isAdmin()) {
            return null;
        }

        return $this->managedOrganizations()->pluck('organizations.id')->all();
    }

    public function canManageOrganization(?string $organizationId): bool
    {
        if ($organizationId === null) {
            return $this->isAdmin();
        }
        $ids = $this->manageableOrganizationIds();

        return $ids === null || in_array($organizationId, $ids, true);
    }

    /** The user as the frontend sees it, with what they may administer. */
    public function toAuthArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'is_admin' => $this->isAdmin(),
            'managed_organizations' => $this->managedOrganizations()
                ->orderBy('name')
                ->get(['organizations.id', 'organizations.name', 'organizations.slug'])
                ->map(fn ($o) => ['id' => $o->id, 'name' => $o->name, 'slug' => $o->slug])
                ->values(),
        ];
    }

    public function favorites(): BelongsToMany
    {
        return $this->belongsToMany(Quiz::class, 'favorites', 'user_id', 'quiz_id')
            ->withTimestamps();
    }

    public function subscribedOrganizations(): BelongsToMany
    {
        return $this->belongsToMany(Organization::class, 'organization_subscriptions', 'user_id', 'organization_id')
            ->withTimestamps();
    }

    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new ResetPasswordNotification($token));
    }
}
