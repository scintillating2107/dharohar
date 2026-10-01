-- =============================================================================
-- DHAROHAR - Intelligent Land Record Digitization and Validation System
-- Database & PostGIS Schema Definition (MEMBER 6 Deliverable)
-- =============================================================================

-- Enable PostGIS Extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Define Custom Enum Types
DO $$ BEGIN
    CREATE TYPE record_status_enum AS ENUM (
        'UPLOADED',
        'PROCESSING',
        'OCR_COMPLETED',
        'EXTRACTED',
        'VALIDATION_PENDING',
        'VERIFICATION_REQUIRED',
        'VERIFIED',
        'REJECTED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM (
        'ADMIN',
        'OFFICER',
        'VERIFIER',
        'AI_SYSTEM'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role user_role_enum NOT NULL DEFAULT 'OFFICER',
    department VARCHAR(255) DEFAULT 'Land Records & Revenue Department',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. DOCUMENTS TABLE (Repository reference for original PDF and images)
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_name VARCHAR(255) NOT NULL,
    original_file_path VARCHAR(1024) NOT NULL,
    file_type VARCHAR(50) NOT NULL, -- PDF, PNG, JPG, TIFF
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    status record_status_enum NOT NULL DEFAULT 'UPLOADED',
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. DOCUMENT PAGES TABLE
CREATE TABLE IF NOT EXISTS document_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    page_number INT NOT NULL,
    processed_image_path VARCHAR(1024) NOT NULL,
    width INT,
    height INT,
    dpi INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(document_id, page_number)
);

-- 4. OCR RESULTS TABLE
CREATE TABLE IF NOT EXISTS ocr_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    page_id UUID REFERENCES document_pages(id) ON DELETE CASCADE,
    raw_text TEXT NOT NULL,
    language VARCHAR(20) DEFAULT 'hi', -- Hindi, English, Marathi, etc.
    ocr_engine VARCHAR(100) DEFAULT 'Tesseract + AI Vision',
    ocr_output_json_path VARCHAR(1024) NOT NULL,
    confidence_score FLOAT NOT NULL DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. LAND PARCELS TABLE (PostGIS Spatial Table)
CREATE TABLE IF NOT EXISTS land_parcels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    khasra_number VARCHAR(100) NOT NULL,
    survey_number VARCHAR(100),
    village VARCHAR(150) NOT NULL,
    tehsil VARCHAR(150) NOT NULL,
    district VARCHAR(150) NOT NULL,
    state VARCHAR(150) DEFAULT 'Rajasthan',
    area_sq_meters NUMERIC(12, 4),
    area_acres NUMERIC(10, 4),
    latitude FLOAT,
    longitude FLOAT,
    boundary GEOMETRY(Polygon, 4326),
    centroid GEOMETRY(Point, 4326),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Spatial GIST Indexes for PostGIS Queries
CREATE INDEX IF NOT EXISTS idx_land_parcels_boundary ON land_parcels USING GIST (boundary);
CREATE INDEX IF NOT EXISTS idx_land_parcels_centroid ON land_parcels USING GIST (centroid);
CREATE INDEX IF NOT EXISTS idx_land_parcels_location ON land_parcels (district, tehsil, village, khasra_number);

-- 6. LAND RECORDS TABLE (Main digitized record)
CREATE TABLE IF NOT EXISTS land_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    parcel_id UUID REFERENCES land_parcels(id) ON DELETE SET NULL,
    khasra_number VARCHAR(100) NOT NULL,
    khata_number VARCHAR(100) NOT NULL,
    survey_number VARCHAR(100),
    area VARCHAR(100) NOT NULL,
    village VARCHAR(150) NOT NULL,
    tehsil VARCHAR(150) NOT NULL,
    district VARCHAR(150) NOT NULL,
    state VARCHAR(150) DEFAULT 'Rajasthan',
    land_type VARCHAR(100) DEFAULT 'Agricultural', -- Agricultural, Residential, Commercial, Forest
    mutation_number VARCHAR(100),
    registration_number VARCHAR(100),
    extraction_json_path VARCHAR(1024),
    verified_json_path VARCHAR(1024),
    overall_confidence FLOAT NOT NULL DEFAULT 0.0,
    status record_status_enum NOT NULL DEFAULT 'EXTRACTED',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_land_records_status ON land_records(status);
CREATE INDEX IF NOT EXISTS idx_land_records_khasra ON land_records(khasra_number, village, district);

-- 7. LAND OWNERS TABLE
CREATE TABLE IF NOT EXISTS land_owners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    land_record_id UUID NOT NULL REFERENCES land_records(id) ON DELETE CASCADE,
    owner_name VARCHAR(255) NOT NULL,
    father_name VARCHAR(255) NOT NULL,
    husband_name VARCHAR(255),
    share_percentage FLOAT DEFAULT 100.0,
    aadhaar_hash VARCHAR(255),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. VALIDATION RESULTS TABLE
CREATE TABLE IF NOT EXISTS validation_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    land_record_id UUID NOT NULL REFERENCES land_records(id) ON DELETE CASCADE,
    rule_name VARCHAR(150) NOT NULL,
    rule_category VARCHAR(100) DEFAULT 'Business Rule',
    is_valid BOOLEAN NOT NULL DEFAULT TRUE,
    field_name VARCHAR(100),
    error_message TEXT,
    confidence_score FLOAT DEFAULT 1.0,
    validated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. VERIFICATION HISTORY TABLE
CREATE TABLE IF NOT EXISTS verification_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    land_record_id UUID NOT NULL REFERENCES land_records(id) ON DELETE CASCADE,
    verifier_id UUID REFERENCES users(id) ON DELETE SET NULL,
    previous_status record_status_enum NOT NULL,
    new_status record_status_enum NOT NULL,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. AUDIT LOGS TABLE ⭐
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    record_id UUID NOT NULL, -- References land_records or documents
    entity_type VARCHAR(100) NOT NULL DEFAULT 'LandRecord',
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- E.g., 'CREATE', 'AI_EXTRACTION', 'HUMAN_VERIFICATION', 'STATUS_UPDATE'
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    changes_summary JSONB,
    client_ip VARCHAR(50),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_record ON audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
