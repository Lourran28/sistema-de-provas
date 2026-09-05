package br.com.provas.security;

import java.time.Instant;
import java.util.Date;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTVerifier;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;

import br.com.provas.entities.UserRole;

@Service
public class JwtService {

    private final Algorithm algorithm;
    private final JWTVerifier verifier;
    private final String issuer;
    private final long expirationMinutes;

    public JwtService(
            @Value("${app.security.jwt.secret}") String secret,
            @Value("${app.security.jwt.issuer}") String issuer,
            @Value("${app.security.jwt.expiration-minutes}") long expirationMinutes) {
        if (secret == null || secret.length() < 32) {
            throw new IllegalStateException("JWT_SECRET deve possuir pelo menos 32 caracteres.");
        }
        if (expirationMinutes <= 0) {
            throw new IllegalStateException("JWT_EXPIRATION_MINUTES deve ser maior que zero.");
        }

        this.algorithm = Algorithm.HMAC256(secret);
        this.issuer = issuer;
        this.expirationMinutes = expirationMinutes;
        this.verifier = JWT.require(algorithm).withIssuer(issuer).build();
    }

    public TokenData createToken(UUID userId, String email, UserRole role, long credentialVersion) {
        Instant issuedAt = Instant.now();
        Instant expiresAt = issuedAt.plusSeconds(expirationMinutes * 60);
        String token = JWT.create()
                .withIssuer(issuer)
                .withSubject(userId.toString())
                .withClaim("email", email)
                .withClaim("role", role.name())
                .withClaim("cv", credentialVersion)
                .withIssuedAt(Date.from(issuedAt))
                .withExpiresAt(Date.from(expiresAt))
                .sign(algorithm);

        return new TokenData(token, expiresAt);
    }

    public TokenClaims validateToken(String token) throws JWTVerificationException {
        DecodedJWT decodedToken = verifier.verify(token);
        try {
            Long version = decodedToken.getClaim("cv").asLong();
            return new TokenClaims(
                    UUID.fromString(decodedToken.getSubject()),
                    decodedToken.getClaim("email").asString(),
                    UserRole.valueOf(decodedToken.getClaim("role").asString()),
                    version == null ? 0 : version);
        } catch (IllegalArgumentException | NullPointerException exception) {
            throw new JWTVerificationException("Token inválido.", exception);
        }
    }

    public record TokenData(String token, Instant expiresAt) {
    }

    public record TokenClaims(UUID userId, String email, UserRole role, long credentialVersion) {
    }
}
