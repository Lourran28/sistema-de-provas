package br.com.provas.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.auth0.jwt.exceptions.JWTVerificationException;

import br.com.provas.entities.UserRole;

class JwtServiceTest {

    private static final String SECRET = "chave-de-teste-com-no-minimo-trinta-e-dois-caracteres";

    @Test
    void createsAndValidatesTokenForTheSameUser() {
        JwtService jwtService = new JwtService(SECRET, "provas-test", 30);
        UUID userId = UUID.randomUUID();

        JwtService.TokenData token = jwtService.createToken(userId, "professor@escola.com", UserRole.TEACHER);
        JwtService.TokenClaims claims = jwtService.validateToken(token.token());

        assertEquals(userId, claims.userId());
        assertEquals("professor@escola.com", claims.email());
        assertEquals(UserRole.TEACHER, claims.role());
    }

    @Test
    void rejectsTokenSignedWithAnotherSecret() {
        JwtService issuer = new JwtService(SECRET, "provas-test", 30);
        JwtService verifier = new JwtService("outra-chave-com-no-minimo-trinta-e-dois-caracteres", "provas-test", 30);
        String token = issuer.createToken(UUID.randomUUID(), "professor@escola.com", UserRole.TEACHER).token();

        assertThrows(JWTVerificationException.class, () -> verifier.validateToken(token));
    }
}
