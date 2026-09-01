package br.com.provas.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.boot.SpringApplication;
import org.springframework.mock.env.MockEnvironment;

class RenderPostgresEnvironmentPostProcessorTest {

    @Test
    void usesJdbcValuesFromPostgresUri() {
        MockEnvironment environment = new MockEnvironment();
        environment.setProperty("DATABASE_URL", "postgresql://teacher:secure%40pass@db.internal:5432/provas?sslmode=require");

        new RenderPostgresEnvironmentPostProcessor().postProcessEnvironment(environment, new SpringApplication());

        assertThat(environment.getProperty("spring.datasource.url"))
                .isEqualTo("jdbc:postgresql://db.internal:5432/provas?sslmode=require");
        assertThat(environment.getProperty("spring.datasource.username")).isEqualTo("teacher");
        assertThat(environment.getProperty("spring.datasource.password")).isEqualTo("secure@pass");
    }

    @Test
    void movesCredentialsOutOfJdbcUrl() {
        MockEnvironment environment = new MockEnvironment();
        environment.setProperty("DATABASE_URL",
                "jdbc:postgresql://db.internal:5432/provas?user=teacher&password=secure%40pass&sslmode=require");

        new RenderPostgresEnvironmentPostProcessor().postProcessEnvironment(environment, new SpringApplication());

        assertThat(environment.getProperty("spring.datasource.url"))
                .isEqualTo("jdbc:postgresql://db.internal:5432/provas?sslmode=require");
        assertThat(environment.getProperty("spring.datasource.username")).isEqualTo("teacher");
        assertThat(environment.getProperty("spring.datasource.password")).isEqualTo("secure@pass");
    }
}
