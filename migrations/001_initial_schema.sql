-- Initial Database Schema
-- Customer Data Enrichment Engine
-- Migration: 001_initial_schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum types
CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'churned');
CREATE TYPE lead_source AS ENUM ('website', 'referral', 'social', 'email', 'paid_ads', 'organic', 'partner', 'event', 'other');
CREATE TYPE enrichment_provider AS ENUM ('clearbit', 'hunter', 'fullcontact', 'zerobounce', 'manual', 'internal');
CREATE TYPE scoring_model AS ENUM ('demographic', 'firmographic', 'behavioral', 'engagement', 'ml_ensemble');

-- Organizations table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255),
    industry VARCHAR(100),
    company_size VARCHAR(50),
    annual_revenue DECIMAL(15, 2),
    headquarters_city VARCHAR(100),
    headquarters_country VARCHAR(100),
    linkedin_url VARCHAR(500),
    twitter_handle VARCHAR(100),
    facebook_url VARCHAR(500),
    tech_stack JSONB DEFAULT '[]'::jsonb,
    enriched_at TIMESTAMP WITH TIME ZONE,
    enrichment_provider enrichment_provider,
    data_quality_score DECIMAL(3, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contacts table
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    full_name VARCHAR(255),
    job_title VARCHAR(255),
    seniority_level VARCHAR(50),
    department VARCHAR(100),
    phone VARCHAR(50),
    mobile_phone VARCHAR(50),
    linkedin_url VARCHAR(500),
    twitter_handle VARCHAR(100),
    avatar_url VARCHAR(500),
    location_city VARCHAR(100),
    location_country VARCHAR(100),
    bio TEXT,
    interests JSONB DEFAULT '[]'::jsonb,
    enriched_at TIMESTAMP WITH TIME ZONE,
    enrichment_provider enrichment_provider,
    email_validated BOOLEAN DEFAULT FALSE,
    email_validation_provider VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Leads table
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    company_name VARCHAR(255),
    job_title VARCHAR(255),
    phone VARCHAR(50),
    source lead_source NOT NULL,
    status lead_status DEFAULT 'new',
    assigned_to UUID,
    owner_id UUID,
    campaign_id UUID,
    tags JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    converted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Lead scoring table
CREATE TABLE lead_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    total_score DECIMAL(5, 2) NOT NULL,
    demographic_score DECIMAL(5, 2) DEFAULT 0.00,
    firmographic_score DECIMAL(5, 2) DEFAULT 0.00,
    behavioral_score DECIMAL(5, 2) DEFAULT 0.00,
    engagement_score DECIMAL(5, 2) DEFAULT 0.00,
    ml_score DECIMAL(5, 2) DEFAULT 0.00,
    scoring_model scoring_model DEFAULT 'ml_ensemble',
    model_version VARCHAR(50),
    feature_weights JSONB DEFAULT '{}'::jsonb,
    score_breakdown JSONB DEFAULT '{}'::jsonb,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enrichment history table
CREATE TABLE enrichment_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    provider enrichment_provider NOT NULL,
    enrichment_type VARCHAR(50) NOT NULL,
    request_payload JSONB,
    response_data JSONB,
    status VARCHAR(20) NOT NULL,
    error_message TEXT,
    credits_used INTEGER DEFAULT 0,
    enrichment_duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Engagement tracking table
CREATE TABLE engagements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    engagement_type VARCHAR(50) NOT NULL,
    channel VARCHAR(50) NOT NULL,
    subject VARCHAR(255),
    content TEXT,
    duration_seconds INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhook events table
CREATE TABLE webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    source VARCHAR(100),
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API keys table
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(10) NOT NULL,
    user_id UUID NOT NULL,
    permissions JSONB DEFAULT '[]'::jsonb,
    rate_limit INTEGER DEFAULT 1000,
    expires_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit log table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_source ON leads(source);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX idx_leads_owner_id ON leads(owner_id);
CREATE INDEX idx_leads_contact_id ON leads(contact_id);
CREATE INDEX idx_leads_organization_id ON leads(organization_id);

CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_organization_id ON contacts(organization_id);
CREATE INDEX idx_contacts_enriched_at ON contacts(enriched_at DESC);

CREATE INDEX idx_organizations_domain ON organizations(domain);
CREATE INDEX idx_organizations_industry ON organizations(industry);

CREATE INDEX idx_lead_scores_lead_id ON lead_scores(lead_id);
CREATE INDEX idx_lead_scores_total_score ON lead_scores(total_score DESC);
CREATE INDEX idx_lead_scores_calculated_at ON lead_scores(calculated_at DESC);

CREATE INDEX idx_enrichment_history_lead_id ON enrichment_history(lead_id);
CREATE INDEX idx_enrichment_history_provider ON enrichment_history(provider);
CREATE INDEX idx_enrichment_history_created_at ON enrichment_history(created_at DESC);

CREATE INDEX idx_engagements_lead_id ON engagements(lead_id);
CREATE INDEX idx_engagements_occurred_at ON engagements(occurred_at DESC);
CREATE INDEX idx_engagements_type ON engagements(engagement_type);

CREATE INDEX idx_webhook_events_status ON webhook_events(status);
CREATE INDEX idx_webhook_events_type ON webhook_events(event_type);
CREATE INDEX idx_webhook_events_created_at ON webhook_events(created_at DESC);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);

-- Full-text search indexes
CREATE INDEX idx_contacts_search ON contacts USING GIN (
    to_tsvector('english', COALESCE(first_name, '') || ' ' || COALESCE(last_name, '') || ' ' || COALESCE(email, ''))
);

CREATE INDEX idx_leads_search ON leads USING GIN (
    to_tsvector('english', COALESCE(first_name, '') || ' ' || COALESCE(last_name, '') || ' ' || COALESCE(email, '') || ' ' || COALESCE(company_name, ''))
);

CREATE INDEX idx_organizations_search ON organizations USING GIN (
    to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(domain, '') || ' ' || COALESCE(industry, ''))
);
