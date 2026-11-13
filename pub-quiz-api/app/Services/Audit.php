<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Organization;
use App\Models\Quiz;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

/**
 * Writes the audit log. Called explicitly from the controllers rather than
 * from model events, so the scraper's thousands of automatic writes do not
 * bury the handful of changes people make by hand.
 */
class Audit
{
    private const IGNORED = ['updated_at', 'created_at', 'quizzes_count'];

    public static function record(
        string $action,
        ?Model $subject = null,
        ?array $changes = null,
        ?User $actor = null,
    ): AuditLog {
        $request = request();
        $actor ??= $request?->user();

        return AuditLog::create([
            'user_id' => $actor?->id,
            'user_name' => $actor?->name,
            'user_email' => $actor?->email,
            'action' => $action,
            'subject_type' => $subject ? self::typeOf($subject) : null,
            'subject_id' => $subject?->getKey() !== null ? (string) $subject->getKey() : null,
            'subject_label' => $subject ? self::labelOf($subject) : null,
            'organization_id' => $subject ? self::organizationOf($subject) : null,
            'changes' => $changes,
            'ip' => $request?->ip(),
            'user_agent' => $request ? mb_substr((string) $request->userAgent(), 0, 255) : null,
        ]);
    }

    /** Every stored column of a model, as the database holds it. */
    public static function snapshot(Model $model): array
    {
        return collect($model->getAttributes())
            ->except(self::IGNORED)
            ->all();
    }

    /**
     * What an update just changed, as {field: {old, new}}. Call after save():
     * it reads the model's own change tracking, so only fields whose value
     * actually changed appear, not every field the form sent back.
     *
     * @param  array<string, mixed>  $before  getRawOriginal() taken before the update
     */
    public static function diff(Model $model, array $before): array
    {
        $out = [];
        foreach ($model->getChanges() as $field => $new) {
            if (in_array($field, self::IGNORED, true)) {
                continue;
            }
            $out[$field] = ['old' => $before[$field] ?? null, 'new' => $new];
        }

        return $out;
    }

    private static function typeOf(Model $model): string
    {
        return match (true) {
            $model instanceof Quiz => 'quiz',
            $model instanceof Organization => 'organization',
            $model instanceof User => 'user',
            default => class_basename($model),
        };
    }

    private static function labelOf(Model $model): ?string
    {
        return match (true) {
            $model instanceof Quiz => trim($model->title . ($model->quiz_date ? ' · ' . $model->quiz_date->format('d.m.Y') : '')),
            $model instanceof Organization => $model->name,
            $model instanceof User => "{$model->name} ({$model->email})",
            default => null,
        };
    }

    private static function organizationOf(Model $model): ?string
    {
        return match (true) {
            $model instanceof Quiz => $model->organization_id,
            $model instanceof Organization => $model->id,
            default => null,
        };
    }
}
