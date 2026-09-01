package br.com.provas.config;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

/** Converts Render's PostgreSQL URI into Spring's JDBC datasource settings. */
public final class RenderPostgresEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {

    private static final String PROPERTY_SOURCE_NAME = "renderPostgres";

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        String databaseUrl = environment.getProperty("DATABASE_URL");
        if (databaseUrl == null || databaseUrl.isBlank() || databaseUrl.startsWith("jdbc:")) {
            return;
        }

        URI uri;
        try {
            uri = URI.create(databaseUrl);
        } catch (IllegalArgumentException exception) {
            return;
        }

        boolean unsupportedScheme = !"postgres".equals(uri.getScheme()) && !"postgresql".equals(uri.getScheme());
        if (unsupportedScheme || uri.getHost() == null || uri.getPath() == null || uri.getPath().isBlank()) {
            return;
        }

        Map<String, Object> properties = new LinkedHashMap<>();
        properties.put("spring.datasource.url", toJdbcUrl(uri));

        String userInfo = uri.getRawUserInfo();
        if (userInfo != null && !userInfo.isBlank()) {
            String[] credentials = userInfo.split(":", 2);
            if (!environment.containsProperty("DATABASE_USERNAME")) {
                properties.put("spring.datasource.username", decode(credentials[0]));
            }
            if (credentials.length == 2 && !environment.containsProperty("DATABASE_PASSWORD")) {
                properties.put("spring.datasource.password", decode(credentials[1]));
            }
        }

        environment.getPropertySources().addFirst(new MapPropertySource(PROPERTY_SOURCE_NAME, properties));
    }

    private String toJdbcUrl(URI uri) {
        String port = uri.getPort() == -1 ? "" : ":" + uri.getPort();
        String query = uri.getRawQuery() == null || uri.getRawQuery().isBlank() ? "" : "?" + uri.getRawQuery();
        return "jdbc:postgresql://" + uri.getHost() + port + uri.getRawPath() + query;
    }

    private String decode(String value) {
        return URLDecoder.decode(value, StandardCharsets.UTF_8);
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }
}
