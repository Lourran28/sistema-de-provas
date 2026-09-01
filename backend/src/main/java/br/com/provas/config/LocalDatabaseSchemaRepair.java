package br.com.provas.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Keeps databases created by older local builds compatible with the current
 * version schema. Production databases receive this change through Flyway.
 */
@Component
@Profile("local")
public class LocalDatabaseSchemaRepair implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    public LocalDatabaseSchemaRepair(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments arguments) {
        jdbcTemplate.execute("ALTER TABLE exam_versions DROP COLUMN IF EXISTS public_token");
    }
}
