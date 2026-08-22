-- ============================================================
-- NeonDB / pgAdmin Data Cleanup Script
-- Safely truncates all operational test data and sets up a clean
-- Demo tenant and Admin user for real data testing.
-- ============================================================

-- 1. Truncate all operational data tables (CASCADE handles foreign key dependencies)
TRUNCATE TABLE 
    fee_payments,
    fee_invoices,
    fee_structures,
    attendance_records,
    attendance_sessions,
    exam_results,
    exams,
    growth_cards,
    ai_messages,
    ai_sessions,
    ai_embeddings,
    ai_agent_runs,
    ai_feedback,
    ai_generated_reports,
    ai_logs,
    dashboard_snapshots,
    batch_students,
    classes,
    batches,
    subjects,
    students,
    admissions,
    lead_activities,
    leads,
    syllabus_progress,
    syllabus_items,
    inbox_notifications,
    notification_logs,
    notification_templates,
    otp_codes,
    otp_verifications,
    refresh_tokens,
    chats,
    messages,
    knowledge_chunks,
    user_profiles,
    users,
    tenants
CASCADE;

-- 2. Insert Base Demo Tenant
INSERT INTO tenants (id, name, subdomain, plan, is_active, settings, created_at, updated_at)
VALUES (
    '104e64da-797a-4e81-abee-e14d4f52aa27',
    'Demo Coaching Institute',
    'demo',
    'pro',
    true,
    '{"theme": "blue", "locale": "en-IN"}'::jsonb,
    NOW(),
    NOW()
);

-- 3. Insert Base Demo Users (Password: Admin@1234)
INSERT INTO users (id, tenant_id, email, password_hash, role, first_name, last_name, is_active, created_at, updated_at)
VALUES 
    ('9dc14449-f587-42e1-accb-3bb7b80ac6bd', '104e64da-797a-4e81-abee-e14d4f52aa27', 'owner@demo.com', '$2b$12$3m7ZOxXdyqtInWXQnsOuquAZzXjwKtp..LmmKJfy5ptASZhlIQ19O', 'owner', 'Demo', 'Owner', true, NOW(), NOW()),
    ('43413b65-b811-46d3-93f3-1aaf74de29bc', '104e64da-797a-4e81-abee-e14d4f52aa27', 'counselor@demo.com', '$2b$12$3m7ZOxXdyqtInWXQnsOuquAZzXjwKtp..LmmKJfy5ptASZhlIQ19O', 'counselor', 'Priya', 'Sharma', true, NOW(), NOW()),
    ('4dd15749-702a-4aa9-ab22-535df7dff7ea', '104e64da-797a-4e81-abee-e14d4f52aa27', 'tutor@demo.com', '$2b$12$3m7ZOxXdyqtInWXQnsOuquAZzXjwKtp..LmmKJfy5ptASZhlIQ19O', 'tutor', 'Rahul', 'Verma', true, NOW(), NOW());
