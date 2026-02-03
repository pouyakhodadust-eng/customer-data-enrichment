-- Migration: 001_create_initial_schema
-- Created: 2026-02-03
-- Description: Initial schema for Customer Data Enrichment Engine

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
    crm_type VARCHAR(50),
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
    status VARCHAR(50) DEFAULT 'pending',
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_leads_customer_email ON leads(customer_id, email);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

-- ============================================
-- ENRICHMENT DATA TABLES
-- ============================================

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

CREATE TABLE IF NOT EXISTS company_enrichment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    domain VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    size VARCHAR(50),
    industry VARCHAR(255),
    description TEXT,
    founded_year INTEGER,
    logo_url VARCHAR(500),
    raw_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(lead_id)
);

CREATE INDEX IF NOT EXISTS idx_company_domain ON company_enrichment(domain);

-- ============================================
-- SCORING TABLES
-- ============================================

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

CREATE INDEX IF NOT EXISTS idx_scoring_lead ON scoring_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_scoring_created ON scoring_history(created_at DESC);

-- ============================================
-- UTILITY FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
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
            DROP TRIGGER IF EXISTS update_%s_updated_at ON %s;
            CREATE TRIGGER update_%s_updated_at
            BEFORE UPDATE ON %s
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at()', t, t, t, t);
    END LOOP;
END;
$$ LANGUAGE plpgsql;
