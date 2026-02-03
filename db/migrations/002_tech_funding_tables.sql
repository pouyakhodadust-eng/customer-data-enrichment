-- Migration: 002_add_tech_stack_and_funding
-- Created: 2026-02-03
-- Description: Add tech stack and funding data tables

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

-- Scoring rules (customizable per customer)
CREATE TABLE IF NOT EXISTS scoring_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    rule_name VARCHAR(255) NOT NULL,
    rule_type VARCHAR(50),
    field_path VARCHAR(255),
    operator VARCHAR(50),
    value JSONB NOT NULL,
    score_adjustment INTEGER,
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

-- Delivery tables
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

CREATE TABLE IF NOT EXISTS crm_sync (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    crm_type VARCHAR(50) NOT NULL,
    crm_record_id VARCHAR(255),
    crm_record_type VARCHAR(100),
    sync_type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    raw_response JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
