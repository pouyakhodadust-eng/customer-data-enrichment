-- Database Indexes and Triggers
-- Customer Data Enrichment Engine
-- Migration: 002_indexes_and_triggers.sql

-- ============================================
-- PARTITIONING
-- ============================================

-- Create partitions for large tables by time
CREATE TABLE leads_partitioned (
    LIKE leads INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Create monthly partitions for leads
CREATE TABLE leads_2024_01 PARTITION OF leads_partitioned
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE leads_2024_02 PARTITION OF leads_partitioned
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
CREATE TABLE leads_2024_03 PARTITION OF leads_partitioned
    FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');
-- Add more partitions as needed

-- Partition engagement events by month
CREATE TABLE engagements_partitioned (
    LIKE engagements INCLUDING ALL
) PARTITION BY RANGE (occurred_at);

CREATE TABLE engagements_2024_01 PARTITION OF engagements_partitioned
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE engagements_2024_02 PARTITION OF engagements_partitioned
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
CREATE TABLE engagements_2024_03 PARTITION OF engagements_partitioned
    FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');

-- ============================================
-- COMPOSITE INDEXES
-- ============================================

-- Leads composite indexes
CREATE INDEX idx_leads_status_created ON leads(status, created_at DESC);
CREATE INDEX idx_leads_source_status ON leads(source, status);
CREATE INDEX idx_leads_owner_status ON leads(owner_id, status);
CREATE INDEX idx_leads_tags ON leads USING GIN (tags);
CREATE INDEX idx_leads_metadata ON leads USING GIN (metadata);

-- Contacts composite indexes
CREATE INDEX idx_contacts_org_enriched ON contacts(organization_id, enriched_at DESC);
CREATE INDEX idx_contacts_name_email ON contacts(last_name, email);
CREATE INDEX idx_contacts_location ON contacts(location_country, location_city);

-- Organizations composite indexes
CREATE INDEX idx_orgs_industry_size ON organizations(industry, company_size);
CREATE INDEX idx_orgs_enriched_quality ON organizations(enriched_at, data_quality_score DESC);

-- Lead scores composite indexes
CREATE INDEX idx_scores_lead_calculated ON lead_scores(lead_id, calculated_at DESC);
CREATE INDEX idx_scores_total_range ON lead_scores(total_score) 
    WHERE total_score >= 0 AND total_score <= 100;

-- ============================================
-- PARTIAL INDEXES
-- ============================================

-- Index for active leads only
CREATE INDEX idx_leads_active ON leads(created_at DESC) 
    WHERE deleted_at IS NULL AND status NOT IN ('won', 'lost', 'churned');

-- Index for high-scoring leads
CREATE INDEX idx_leads_high_score ON lead_scores(lead_id) 
    WHERE total_score >= 80;

-- Index for pending webhook events
CREATE INDEX idx_webhooks_pending ON webhook_events(next_retry_at) 
    WHERE status = 'pending' OR status = 'retry_scheduled';

-- Index for recent audit logs
CREATE INDEX idx_audit_recent ON audit_logs(created_at DESC) 
    WHERE created_at > NOW() - INTERVAL '30 days';

-- ============================================
-- TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at
    BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_keys_updated_at
    BEFORE UPDATE ON api_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SOFT DELETE TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION soft_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO deleted_records (table_name, record_id, deleted_at)
        VALUES (TG_TABLE_NAME, OLD.id, NOW());
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create soft delete support
CREATE TABLE deleted_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_deleted_records_table ON deleted_records(table_name, record_id);

-- ============================================
-- DATA QUALITY TRIGGERS
-- ============================================

-- Update full name when contact name changes
CREATE OR REPLACE FUNCTION update_contact_full_name()
RETURNS TRIGGER AS $$
BEGIN
    NEW.full_name := NULLIF(TRIM(NEW.first_name || ' ' || NEW.last_name), '');
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_contact_full_name_trigger
    BEFORE INSERT OR UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_contact_full_name();

-- Calculate organization data quality score
CREATE OR REPLACE FUNCTION calculate_org_quality_score()
RETURNS TRIGGER AS $$
DECLARE
    field_count INTEGER;
    filled_count INTEGER;
BEGIN
    -- Count non-null fields
    SELECT 
        COUNT(*) INTO field_count
    FROM (
        SELECT unnest(ARRAY[
            NEW.name, NEW.domain, NEW.industry, NEW.company_size,
            NEW.annual_revenue, NEW.headquarters_city, NEW.linkedin_url
        ]) AS field
    ) AS fields;
    
    SELECT COUNT(*) INTO filled_count
    FROM (
        SELECT unnest(ARRAY[
            NEW.name, NEW.domain, NEW.industry, NEW.company_size,
            NEW.annual_revenue, NEW.headquarters_city, NEW.linkedin_url
        ]) AS field
    ) AS fields
    WHERE field IS NOT NULL AND field != '';
    
    NEW.data_quality_score := ROUND((filled_count::DECIMAL / NULLIF(field_count, 0) * 100)::NUMERIC, 2);
    NEW.enriched_at := NOW();
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER calculate_org_quality_trigger
    BEFORE INSERT OR UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION calculate_org_quality_score();

-- ============================================
-- LEAD SCORING TRIGGER
-- ============================================

-- Auto-calculate lead score when lead data changes
CREATE OR REPLACE FUNCTION auto_recalculate_lead_score()
RETURNS TRIGGER AS $$
DECLARE
    new_score DECIMAL(5, 2);
BEGIN
    -- Trigger scoring calculation
    PERFORM calculate_lead_score(NEW.id);
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER auto_score_lead
    AFTER INSERT OR UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION auto_recalculate_lead_score();

-- ============================================
-- AUTOMATION TRIGGERS
-- ============================================

-- Create audit entry on lead status change
CREATE OR REPLACE FUNCTION audit_lead_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status != OLD.status THEN
        INSERT INTO audit_logs (user_id, action, resource_type, resource_id, old_values, new_values)
        VALUES (
            NEW.owner_id,
            'status_change',
            'lead',
            NEW.id,
            to_jsonb(OLD) - 'updated_at' - 'created_at',
            to_jsonb(NEW) - 'updated_at' - 'created_at'
        );
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER audit_lead_status
    AFTER UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION audit_lead_status_change();

-- ============================================
-- VIEWS
-- ============================================

-- View: Enriched leads with scores
CREATE OR REPLACE VIEW v_enriched_leads AS
SELECT 
    l.id,
    l.email,
    l.first_name,
    l.last_name,
    l.company_name,
    l.job_title,
    l.source,
    l.status,
    l.created_at,
    o.name AS organization_name,
    o.industry,
    o.company_size,
    o.data_quality_score AS org_quality_score,
    ls.total_score,
    ls.demographic_score,
    ls.firmographic_score,
    ls.behavioral_score,
    ls.engagement_score,
    c.email_validated,
    c.linkedin_url
FROM leads l
LEFT JOIN organizations o ON l.organization_id = o.id
LEFT JOIN contacts c ON l.contact_id = c.id
LEFT JOIN lead_scores ls ON l.id = ls.lead_id
WHERE l.deleted_at IS NULL;

-- View: Lead pipeline summary
CREATE OR REPLACE VIEW v_pipeline_summary AS
SELECT 
    l.status,
    COUNT(*) AS lead_count,
    COUNT(ls.id) AS scored_count,
    AVG(ls.total_score) AS avg_score,
    SUM(CASE WHEN ls.total_score >= 80 THEN 1 ELSE 0 END) AS hot_leads
FROM leads l
LEFT JOIN lead_scores ls ON l.id = ls.lead_id
WHERE l.deleted_at IS NULL
    AND l.created_at >= NOW() - INTERVAL '90 days'
GROUP BY l.status
ORDER BY 
    CASE l.status
        WHEN 'new' THEN 1
        WHEN 'contacted' THEN 2
        WHEN 'qualified' THEN 3
        WHEN 'proposal' THEN 4
        WHEN 'negotiation' THEN 5
        ELSE 6
    END;

-- View: Top performing sources
CREATE OR REPLACE VIEW v_source_performance AS
SELECT 
    l.source,
    COUNT(*) AS total_leads,
    COUNT(DISTINCT CASE WHEN l.status IN ('won', 'qualified') THEN l.id END) AS converted_leads,
    ROUND(
        COUNT(DISTINCT CASE WHEN l.status IN ('won', 'qualified') THEN l.id END)::DECIMAL / 
        NULLIF(COUNT(*), 0) * 100, 2
    ) AS conversion_rate,
    AVG(ls.total_score) AS avg_score
FROM leads l
LEFT JOIN lead_scores ls ON l.id = ls.lead_id
WHERE l.deleted_at IS NULL
    AND l.created_at >= NOW() - INTERVAL '180 days'
GROUP BY l.source
ORDER BY conversion_rate DESC;

-- View: Engagement summary
CREATE OR REPLACE VIEW v_engagement_summary AS
SELECT 
    l.id AS lead_id,
    l.email,
    COUNT(e.id) AS total_engagements,
    COUNT(DISTINCT e.engagement_type) AS unique_engagement_types,
    MAX(e.occurred_at) AS last_engagement,
    SUM(e.duration_seconds) AS total_duration_seconds
FROM leads l
LEFT JOIN engagements e ON l.id = e.lead_id
WHERE e.occurred_at >= NOW() - INTERVAL '30 days'
GROUP BY l.id, l.email;

-- ============================================
-- MATERIALIZED VIEWS (Refreshed Periodically)
-- ============================================

-- Materialized view for daily metrics
CREATE MATERIALIZED VIEW mv_daily_metrics AS
SELECT 
    DATE(created_at) AS metric_date,
    COUNT(*) AS new_leads,
    COUNT(DISTINCT CASE WHEN status IN ('won', 'qualified') THEN id END) AS conversions,
    COUNT(DISTINCT source) AS active_sources
FROM leads
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE(created_at)
ORDER BY metric_date;

CREATE UNIQUE INDEX idx_mv_daily_metrics_date ON mv_daily_metrics(metric_date);

-- Refresh function for materialized view
CREATE OR REPLACE FUNCTION refresh_daily_metrics()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_metrics;
END;
$$ language 'plpgsql';

-- ============================================
-- CLEANUP FUNCTIONS
-- ============================================

-- Cleanup old webhook events
CREATE OR REPLACE FUNCTION cleanup_old_webhooks(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM webhook_events 
    WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL
    AND status IN ('completed', 'failed')
    AND retry_count >= 3;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ language 'plpgsql';

-- Cleanup old audit logs
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(retention_days INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM audit_logs 
    WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ language 'plpgsql';
