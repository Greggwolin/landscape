BEGIN;

CREATE TABLE IF NOT EXISTS landscape.tbl_container (
    container_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id BIGINT NOT NULL,
    parent_container_id BIGINT,
    container_level INTEGER NOT NULL CHECK (container_level IN (1, 2, 3)),
    container_code VARCHAR(50) NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    attributes JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_container_project
      FOREIGN KEY (project_id)
      REFERENCES landscape.tbl_project(project_id)
      ON DELETE CASCADE,
    CONSTRAINT fk_container_parent
      FOREIGN KEY (parent_container_id)
      REFERENCES landscape.tbl_container(container_id)
      ON DELETE CASCADE,
    CONSTRAINT uq_container_code UNIQUE (project_id, container_code),
    CONSTRAINT ck_container_parent_level
      CHECK ((container_level = 1 AND parent_container_id IS NULL)
         OR (container_level IN (2, 3) AND parent_container_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_container_project_level
  ON landscape.tbl_container(project_id, container_level, sort_order, container_id);

CREATE INDEX IF NOT EXISTS idx_container_parent
  ON landscape.tbl_container(parent_container_id);

CREATE TABLE IF NOT EXISTS landscape.tbl_project_config (
    project_id BIGINT PRIMARY KEY,
    asset_type VARCHAR(50) NOT NULL,
    level1_label VARCHAR(50) NOT NULL DEFAULT 'Area',
    level2_label VARCHAR(50) NOT NULL DEFAULT 'Phase',
    level3_label VARCHAR(50) NOT NULL DEFAULT 'Parcel',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_project_config_project
      FOREIGN KEY (project_id)
      REFERENCES landscape.tbl_project(project_id)
      ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_project_config_asset_type
  ON landscape.tbl_project_config(asset_type);

COMMIT;
