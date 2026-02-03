-- Customer Data Enrichment Engine - Database Schema
-- PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CORE TABLES
-- ============================================

-- Customers table (tenant storage)
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    webhook_url VARCHAR(500) NOT NULL,
    plan_tier VARCHAR(50) DEFAULT 'starter',
    icp_config JSONB DEFAULT '{}',
    slack_webhook_url TEXT,
    slack_channel VARCHAR(100),
    crm_type VARCHAR(50), -- 'salesforce', 'hubspot', 'custom'
    crm_access_token TEXT,
    api_usage_limit INTEGER DEFAULT 1000,
    api_usage_current INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    domain VARCHAR(255),
    original_data JSONB DEFAULT '{}',
    enriched_data JSONB DEFAULT '{}',
    is_personal BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'pending', -- pending, hot, warm, cold, disqualified, error
    score INTEGER,
    fit_level VARCHAR(20),
    ai_reasoning TEXT,
    recommendations JSONB DEFAULT '[]',
    objections JSONB DEFAULT '[]',
    next_steps TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(customer_id, email)
);

-- Index for fast lead lookups
CREATE INDEX IF NOT EXISTS idx_leads_customer_email ON leads(customer_id, email);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

-- ============================================
-- ENRICHMENT DATA TABLES
-- ============================================

-- Person enrichment data
CREATE TABLE IF NOT EXISTS person_enrichment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    title VARCHAR(255),
    seniority VARCHAR(100),
    location VARCHAR(255),
    linkedin_url VARCHAR(500),
    bio TEXT,
    raw_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(lead_id)
);

-- Company enrichment data
CREATE TABLE IF NOT EXISTS company_enrichment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    domain VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    legal_name VARCHAR(255),
    domain_verified BOOLEAN DEFAULT FALSE,
    size VARCHAR(50),
    size_range VARCHAR(100),
    industry VARCHAR(255),
    sub_industry VARCHAR(255),
    description TEXT,
    founded_year INTEGER,
    logo_url VARCHAR(500),
    website_url VARCHAR(500),
    linkedin_url VARCHAR(500),
    crunchbase_url VARCHAR(500),
    raw_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(lead_id)
);

-- Index for company lookups by domain
CREATE INDEX IF NOT EXISTS idx_company_domain ON company_enrichment(domain);

-- Tech stack data
CREATE TABLE IF NOT EXISTS tech_stack (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    category VARCHAR(100),
    name VARCHAR(255),
    technology VARCHAR(255),
    confidence DECIMAL(3,2),
    first_seen DATE,
    last_seen DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for tech stack queries
CREATE INDEX IF NOT EXISTS idx_tech_stack_lead ON tech_stack(lead_id);
CREATE INDEX IF NOT EXISTS idx_tech_stack_name ON tech_stack(name);

-- Funding data
CREATE TABLE IF NOT EXISTS funding_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    domain VARCHAR(255) NOT NULL,
    total_funding DECIMAL(15,2),
    last_funding_round VARCHAR(100),
    last_funding_amount DECIMAL(15,2),
    last_funding_date DATE,
    investor_names TEXT[],
    funding_stage VARCHAR(50),
    raw_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(lead_id)
);

-- Hiring signals
CREATE TABLE IF NOT EXISTS hiring_signals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    domain VARCHAR(255) NOT NULL,
    open_positions INTEGER DEFAULT 0,
    recent_hires INTEGER DEFAULT 0,
    growth_rate DECIMAL(5,2),
    company_size_change VARCHAR(50),
    last_job_posting DATE,
    raw_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(lead_id)
);

-- ============================================
-- SCORING TABLES
-- ============================================

-- Scoring history (audit trail)
CREATE TABLE IF NOT EXISTS scoring_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    model_used VARCHAR(100) NOT NULL,
    score INTEGER NOT NULL,
    reasoning TEXT,
    fit_level VARCHAR(20),
    recommendations JSONB DEFAULT '[]',
    input_data JSONB DEFAULT '{}',
    output_data JSONB DEFAULT '{}',
    processing_time_ms INTEGER,
    api_cost DECIMAL(10,6),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Index for scoring history queries
CREATE INDEX IF NOT EXISTS idx_scoring_lead ON scoring_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_scoring_customer ON scoring_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_scoring_created ON scoring_history(created_at DESC);

-- Scoring rules (customizable per customer)
CREATE TABLE IF NOT EXISTS scoring_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    rule_name VARCHAR(255) NOT NULL,
    rule_type VARCHAR(50), -- 'boost', 'penalty', 'threshold'
    field_path VARCHAR(255), -- JSON path, e.g., 'company.size'
    operator VARCHAR(50), -- 'equals', 'contains', 'greater_than', etc.
    value JSONB NOT NULL,
    score_adjustment INTEGER,
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- DELIVERY TABLES
-- ============================================

-- Slack notifications
CREATE TABLE IF NOT EXISTS slack_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    channel VARCHAR(100),
    message_ts VARCHAR(100),
    message_blocks JSONB,
    delivered BOOLEAN DEFAULT FALSE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CRM sync history
CREATE TABLE IF NOT EXISTS crm_sync (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    crm_type VARCHAR(50) NOT NULL,
    crm_record_id VARCHAR(255),
    crm_record_type VARCHAR(100),
    sync_type VARCHAR(50), -- 'create', 'update'
    status VARCHAR(50) DEFAULT 'pending', -- pending, success, failed
    error_message TEXT,
    raw_response JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Nurture sequence enrollments
CREATE TABLE IF NOT EXISTS nurture_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    sequence_name VARCHAR(255) NOT NULL,
    sequence_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    unsubscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ANALYTICS TABLES
-- ============================================

-- Daily metrics (aggregated)
CREATE TABLE IF NOT EXISTS daily_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    leads_processed INTEGER DEFAULT 0,
    enrichment_success_rate DECIMAL(5,2),
    avg_enrichment_time_ms INTEGER,
    avg_score DECIMAL(5,2),
    hot_leads_count INTEGER DEFAULT 0,
    warm_leads_count INTEGER DEFAULT 0,
    cold_leads_count INTEGER DEFAULT 0,
    slack_alerts_sent INTEGER DEFAULT 0,
    crm_sync_count INTEGER DEFAULT 0,
    api_calls INTEGER DEFAULT 0,
    api_cost DECIMAL(10,4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(customer_id, date)
);

-- ============================================
-- UTILITY FUNCTIONS
-- ============================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update trigger to relevant tables
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'updated_at'
        AND table_schema = 'public'
    LOOP
        EXECUTE format('
            CREATE TRIGGER update_%s_updated_at
            BEFORE UPDATE ON %s
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at()', t, t);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SAMPLE DATA
-- ============================================

-- Sample customer (for testing)
INSERT INTO customers (name, email, webhook_url, plan_tier, icp_config)
VALUES (
    'Demo Company',
    'demo@example.com',
    'https://your-n8n-instance.com/webhook/demo',
    'starter',
    '{
        "target_industries": ["B2B SaaS", "Technology", "Software"],
        "target_company_sizes": ["11-50", "51-200", "201-500"],
        "required_tech": ["Salesforce", "HubSpot"],
        "decision_maker_titles": ["VP Sales", "CEO", "Founder", "Head of Revenue"],
        "min_funding_stage": "Series A",
        "preferred_regions": ["North America", "Europe"]
    }'
) ON CONFLICT DO NOTHING;

-- ============================================
-- VIEWS
-- ============================================

-- Lead summary view
CREATE OR REPLACE VIEW lead_summary AS
SELECT 
    c.name as customer_name,
    l.email,
    l.domain,
    l.status,
    l.score,
    l.fit_level,
    l.created_at,
    p.name as person_name,
    p.title as person_title,
    comp.name as company_name,
    comp.size as company_size,
    comp.industry,
    f.total_funding,
    h.open_positions as hiring_activity
FROM leads l
LEFT JOIN customers c ON l.customer_id = c.id
LEFT JOIN person_enrichment p ON p.lead_id = l.id
LEFT JOIN company_enrichment comp ON comp.lead_id = l.id
LEFT JOIN funding_data f ON f.lead_id = l.id
LEFT JOIN hiring_signals h ON h.lead_id = l.id
WHERE l.deleted_at IS NULL;

-- Daily metrics summary
CREATE OR REPLACE VIEW daily_metrics_summary AS
SELECT 
    c.name as customer_name,
    dm.date,
    dm.leads_processed,
    dm.hot_leads_count,
    dm.warm_leads_count,
    dm.cold_leads_count,
    dm.enrichment_success_rate,
    dm.api_cost
FROM daily_metrics dm
LEFT JOIN customers c ON dm.customer_id = c.id
ORDER BY dm.date DESC, c.name;
