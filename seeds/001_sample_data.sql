-- Sample Data for Testing
-- Customer Data Enrichment Engine
-- Seeds: 001_sample_data.sql

-- Insert sample organizations
INSERT INTO organizations (id, name, domain, industry, company_size, annual_revenue, headquarters_city, headquarters_country, linkedin_url, tech_stack, data_quality_score) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'TechCorp Solutions', 'techcorp.com', 'Technology', '100-500', 50000000.00, 'San Francisco', 'USA', 'https://linkedin.com/company/techcorp', '["AWS", "React", "Node.js", "PostgreSQL", "Redis"]', 0.95),
('550e8400-e29b-41d4-a716-446655440002', 'Global Finance Inc', 'globalfinance.com', 'Finance', '500-1000', 150000000.00, 'New York', 'USA', 'https://linkedin.com/company/globalfinance', '["Azure", "Angular", "Python", "MongoDB", "Kafka"]', 0.88),
('550e8400-e29b-41d4-a716-446655440003', 'HealthTech Innovations', 'healthtech.io', 'Healthcare', '50-100', 15000000.00, 'Boston', 'USA', 'https://linkedin.com/company/healthtech', '["GCP", "Vue.js", "Ruby", "MySQL", "Elasticsearch"]', 0.82),
('550e8400-e29b-41d4-a716-446655440004', 'RetailMax', 'retailmax.com', 'Retail', '1000-5000', 500000000.00, 'Chicago', 'USA', 'https://linkedin.com/company/retailmax', '["AWS", "React Native", "Java", "Oracle", "Snowflake"]', 0.90),
('550e8400-e29b-41d4-a716-446655440005', 'EduLearn Platform', 'edulearn.com', 'Education', '100-500', 25000000.00, 'Austin', 'USA', 'https://linkedin.com/company/edulearn', '["AWS", "Next.js", "Go", "PostgreSQL", "Redis"]', 0.85);

-- Insert sample contacts
INSERT INTO contacts (id, organization_id, email, first_name, last_name, job_title, seniority_level, department, phone, linkedin_url, location_city, location_country, email_validated, enrichment_provider) VALUES
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'john.smith@techcorp.com', 'John', 'Smith', 'CTO', 'C-Level', 'Technology', '+1-415-555-0101', 'https://linkedin.com/in/johnsmith', 'San Francisco', 'USA', TRUE, 'clearbit'),
('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'sarah.johnson@globalfinance.com', 'Sarah', 'Johnson', 'VP of Engineering', 'VP', 'Technology', '+1-212-555-0202', 'https://linkedin.com/in/sarahjohnson', 'New York', 'USA', TRUE, 'clearbit'),
('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', 'mike.chen@healthtech.io', 'Mike', 'Chen', 'Director of Product', 'Director', 'Product', '+1-617-555-0303', 'https://linkedin.com/in/mikechen', 'Boston', 'USA', TRUE, 'hunter'),
('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440004', 'emily.davis@retailmax.com', 'Emily', 'Davis', 'Chief Digital Officer', 'C-Level', 'Digital', '+1-312-555-0404', 'https://linkedin.com/in/emilydavis', 'Chicago', 'USA', TRUE, 'clearbit'),
('660e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440005', 'david.wilson@edulearn.com', 'David', 'Wilson', 'Head of Sales', 'VP', 'Sales', '+1-512-555-0505', 'https://linkedin.com/in/davidwilson', 'Austin', 'USA', TRUE, 'fullcontact');

-- Insert sample leads
INSERT INTO leads (id, contact_id, organization_id, email, first_name, last_name, company_name, job_title, phone, source, status, owner_id, tags, metadata) VALUES
('770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'john.smith@techcorp.com', 'John', 'Smith', 'TechCorp Solutions', 'CTO', '+1-415-555-0101', 'website', 'qualified', NULL, '["enterprise", "high-value"]', '{"utm_source": "google", "landing_page": "/demo"}'),
('770e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'sarah.johnson@globalfinance.com', 'Sarah', 'Johnson', 'Global Finance Inc', 'VP of Engineering', '+1-212-555-0202', 'referral', 'proposal', NULL, '["finance-sector", "priority"]', '{"referrer": "existing_customer"}'),
('770e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', 'mike.chen@healthtech.io', 'Mike', 'Chen', 'HealthTech Innovations', 'Director of Product', '+1-617-555-0303', 'linkedin', 'contacted', NULL, '["healthcare", "startup"]', '{"linkedin_campaign": "Q1_2024"}'),
('770e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440004', 'emily.davis@retailmax.com', 'Emily', 'Davis', 'RetailMax', 'Chief Digital Officer', '+1-312-555-0404', 'paid_ads', 'qualified', NULL, '["retail", "enterprise"]', '{"ad_campaign": "spring_sale"}'),
('770e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440005', 'david.wilson@edulearn.com', 'David', 'Wilson', 'EduLearn Platform', 'Head of Sales', '+1-512-555-0505', 'event', 'new', NULL, '["education", "growth"]', '{"event": "EduTech_Conference_2024"}'),
('770e8400-e29b-41d4-a716-446655440006', NULL, NULL, 'alex.turner@startup.io', 'Alex', 'Turner', 'Startup.io', 'CEO', '+1-415-555-0606', 'organic', 'new', NULL, '["startup", "seed-stage"]', '{}'),
('770e8400-e29b-41d4-a716-446655440007', NULL, NULL, 'rachel.kim@enterprise.co', 'Rachel', 'Kim', 'Enterprise Co', 'IT Manager', '+1-408-555-0707', 'email', 'contacted', NULL, '["enterprise", "tech"]', '{"campaign": "newsletter"}'),
('770e8400-e29b-41d4-a716-446655440008', NULL, NULL, 'james.miller@agency.com', 'James', 'Miller', 'Miller Agency', 'Founder', '+1-213-555-0808', 'referral', 'qualified', NULL, '["agency", "creative"]', '{"referrer": "partner_network"}');

-- Insert sample lead scores
INSERT INTO lead_scores (id, lead_id, contact_id, organization_id, total_score, demographic_score, firmographic_score, behavioral_score, engagement_score, ml_score, scoring_model, model_version, feature_weights, score_breakdown) VALUES
('880e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 92.50, 95.00, 90.00, 88.00, 96.00, 93.00, 'ml_ensemble', '1.0.0', '{"engagement": 0.35, "demographic": 0.25, "firmographic": 0.25, "behavioral": 0.15}', '{"company_size_bonus": 15, "title_weight": 20, "engagement_level": 25}'),
('880e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 88.00, 90.00, 92.00, 85.00, 85.00, 88.00, 'ml_ensemble', '1.0.0', '{"engagement": 0.35, "demographic": 0.25, "firmographic": 0.25, "behavioral": 0.15}', '{"industry_match": 20, "budget_indicator": 18}'),
('880e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', 72.00, 78.00, 70.00, 68.00, 72.00, 72.00, 'ml_ensemble', '1.0.0', '{"engagement": 0.35, "demographic": 0.25, "firmographic": 0.25, "behavioral": 0.15}', '{"growth_stage": 12, "product_fit": 15}'),
('880e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440004', 85.00, 88.00, 85.00, 80.00, 87.00, 85.00, 'ml_ensemble', '1.0.0', '{"engagement": 0.35, "demographic": 0.25, "firmographic": 0.25, "behavioral": 0.15}', '{"enterprise_ready": 20, "decision_maker": 18}'),
('880e8400-e29b-41d4-a716-446655440005', '770e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440005', 65.00, 70.00, 62.00, 60.00, 68.00, 65.00, 'ml_ensemble', '1.0.0', '{"engagement": 0.35, "demographic": 0.25, "firmographic": 0.25, "behavioral": 0.15}', '{"event_engagement": 15}'),
('880e8400-e29b-41d4-a716-446655440006', '770e8400-e29b-41d4-a716-446655440006', NULL, NULL, 45.00, 50.00, 40.00, 42.00, 48.00, 45.00, 'ml_ensemble', '1.0.0', '{"engagement": 0.35, "demographic": 0.25, "firmographic": 0.25, "behavioral": 0.15}', '{"startup_risk": -10, "limited_data": -15}'),
('880e8400-e29b-41d4-a716-446655440007', '770e8400-e29b-41d4-a716-446655440007', NULL, NULL, 58.00, 62.00, 55.00, 55.00, 60.00, 58.00, 'ml_ensemble', '1.0.0', '{"engagement": 0.35, "demographic": 0.25, "firmographic": 0.25, "behavioral": 0.15}', '{"email_engagement": 12}'),
('880e8400-e29b-41d4-a716-446655440008', '770e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440008', NULL, 75.00, 80.00, 72.00, 70.00, 78.00, 75.00, 'ml_ensemble', '1.0.0', '{"engagement": 0.35, "demographic": 0.25, "firmographic": 0.25, "behavioral": 0.15}', '{"partner_referral": 15, "agency_fit": 12}');

-- Insert sample engagements
INSERT INTO engagements (id, lead_id, contact_id, engagement_type, channel, subject, content, duration_seconds, occurred_at) VALUES
('990e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', 'email_opened', 'email', 'Product Demo Request', 'Opened demo request email', 30, NOW() - INTERVAL '2 days'),
('990e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', 'email_clicked', 'email', 'Product Demo Request', 'Clicked pricing link', 45, NOW() - INTERVAL '1 day'),
('990e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', 'demo_completed', 'video', 'Product Demo', 'Completed 45-minute demo session', 2700, NOW() - INTERVAL '6 hours'),
('990e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440002', 'email_opened', 'email', 'Proposal Follow-up', 'Opened follow-up email', 25, NOW() - INTERVAL '3 days'),
('990e8400-e29b-41d4-a716-446655440005', '770e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440002', 'meeting_scheduled', 'calendar', 'Technical Discussion', 'Scheduled 1-hour technical discussion', 0, NOW() - INTERVAL '1 day'),
('990e8400-e29b-41d4-a716-446655440006', '770e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440003', 'website_visit', 'web', 'Pricing Page', 'Viewed pricing page for 5 minutes', 300, NOW() - INTERVAL '4 hours'),
('990e8400-e29b-41d4-a716-446655440007', '770e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440004', 'email_opened', 'email', 'Enterprise Features', 'Opened enterprise features email', 40, NOW() - INTERVAL '12 hours'),
('990e8400-e29b-41d4-a716-446655440008', '770e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440004', 'whitepaper_download', 'web', 'Industry Report', 'Downloaded 2024 Industry Report', 120, NOW() - INTERVAL '1 day');

-- Insert sample webhook events
INSERT INTO webhook_events (id, event_type, source, payload, status, processed_at) VALUES
('aa0e8400-e29b-41d4-a716-446655440001', 'lead.created', 'website', '{"email": "new.lead@example.com", "source": "landing_page"}', 'completed', NOW() - INTERVAL '1 hour'),
('aa0e8400-e29b-41d4-a716-446655440002', 'lead.enriched', 'clearbit', '{"lead_id": "770e8400-e29b-41d4-a716-446655440001", "provider": "clearbit"}', 'completed', NOW() - INTERVAL '30 minutes'),
('aa0e8400-e29b-41d4-a716-446655440003', 'lead.score_updated', 'scoring_engine', '{"lead_id": "770e8400-e29b-41d4-a716-446655440001", "score": 92.5}', 'completed', NOW() - INTERVAL '15 minutes'),
('aa0e8400-e29b-41d4-a716-446655440004', 'engagement.detected', 'tracking', '{"lead_id": "770e8400-e29b-41d4-a716-446655440001", "type": "demo_completed"}', 'completed', NOW() - INTERVAL '6 hours');

-- Update sequences
SELECT pg_catalog.setval(pg_get_serial_sequence('organizations', 'id'), 8, true);
SELECT pg_catalog.setval(pg_get_serial_sequence('contacts', 'id'), 6, true);
SELECT pg_catalog.setval(pg_get_serial_sequence('leads', 'id'), 9, true);
SELECT pg_catalog.setval(pg_get_serial_sequence('lead_scores', 'id'), 9, true);
SELECT pg_catalog.setval(pg_get_serial_sequence('engagements', 'id'), 9, true);
SELECT pg_catalog.setval(pg_get_serial_sequence('webhook_events', 'id'), 5, true);
