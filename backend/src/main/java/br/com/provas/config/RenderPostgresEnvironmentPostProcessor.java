package br.com.provas.config;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
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
        if (databaseUrl == null || databaseUrl.isBlank()) {
            return;
        }

        URI uri;
        try {
            uri = URI.create(toPostgresUri(databaseUrl));
        } catch (IllegalArgumentException exception) {
            return;
        }

        boolean unsupportedScheme = !"postgres".equals(uri.getScheme()) && !"postgresql".equals(uri.getScheme());
        if (unsupportedScheme || uri.getHost() == null || uri.getPath() == null || uri.getPath().isBlank()) {
            return;
        }

        Map<String, Object> properties = new LinkedHashMap<>();
        properties.put("spring.datasource.url", toJdbcUrl(uri));

        Map<String, String> queryParameters = parseQuery(uri.getRawQuery());
        String userInfo = uri.getRawUserInfo();
        if (userInfo != null && !userInfo.isBlank()) {
            String[] credentials = userInfo.split(":", 2);
            setCredentials(environment, properties, decode(credentials[0]),
                    credentials.length == 2 ? decode(credentials[1]) : null);
        } else {
            setCredentials(environment, properties,
                    firstNonBlank(queryParameters.get("user"), queryParameters.get("username")),
                    queryParameters.get("password"));
        }

        environment.getPropertySources().addFirst(new MapPropertySource(PROPERTY_SOURCE_NAME, properties));
    }

    private String toPostgresUri(String databaseUrl) {
        if (databaseUrl.startsWith("jdbc:postgresql://")) {
            return databaseUrl.substring("jdbc:".length());
        }
        return databaseUrl;
    }

    private String toJdbcUrl(URI uri) {
        String port = uri.getPort() == -1 ? "" : ":" + uri.getPort();
        String query = Arrays.stream(uri.getRawQuery() == null ? new String[0] : uri.getRawQuery().split("&"))
                .filter(parameter -> !isCredentialParameter(parameter))
                .reduce((left, right) -> left + "&" + right)
                .map(value -> "?" + value)
                .orElse("");
        return "jdbc:postgresql://" + uri.getHost() + port + uri.getRawPath() + query;
    }

    private boolean isCredentialParameter(String parameter) {
        int separator = parameter.indexOf('=');
        String key = separator == -1 ? parameter : parameter.substring(0, separator);
        return "user".equalsIgnoreCase(decode(key))
                || "username".equalsIgnoreCase(decode(key))
                || "password".equalsIgnoreCase(decode(key));
    }

    private Map<String, String> parseQuery(String rawQuery) {
        Map<String, String> parameters = new LinkedHashMap<>();
        if (rawQuery == null || rawQuery.isBlank()) {
            return parameters;
        }

        for (String parameter : rawQuery.split("&")) {
            int separator = parameter.indexOf('=');
            String key = separator == -1 ? parameter : parameter.substring(0, separator);
            String value = separator == -1 ? "" : parameter.substring(separator + 1);
            parameters.putIfAbsent(decode(key).toLowerCase(), decode(value));
        }
        return parameters;
    }

    private void setCredentials(
            ConfigurableEnvironment environment,
            Map<String, Object> properties,
            String username,
            String password) {
        if (!environment.containsProperty("DATABASE_USERNAME") && username != null && !username.isBlank()) {
            properties.put("spring.datasource.username", username);
        }
        if (!environment.containsProperty("DATABASE_PASSWORD") && password != null && !password.isBlank()) {
            properties.put("spring.datasource.password", password);
        }
    }

    private String firstNonBlank(String... values) {
        return Arrays.stream(values)
                .filter(value -> value != null && !value.isBlank())
                .findFirst()
                .orElse(null);
    }

    private String decode(String value) {
        return URLDecoder.decode(value, StandardCharsets.UTF_8);
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }
}
