package br.com.provas.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import br.com.provas.dtos.auth.ForgotPasswordRequest;
import br.com.provas.dtos.auth.ResetPasswordRequest;
import br.com.provas.entities.PasswordResetTokenEntity;
import br.com.provas.entities.UserEntity;
import br.com.provas.entities.UserRole;
import br.com.provas.repositories.PasswordResetTokenRepository;
import br.com.provas.repositories.UserRepository;

@ExtendWith(MockitoExtension.class)
class PasswordResetServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordResetTokenRepository tokenRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private PasswordResetMailService mailService;

    @InjectMocks
    private PasswordResetService passwordResetService;

    @Test
    void silentlyIgnoresUnknownEmail() {
        when(userRepository.findByEmailIgnoreCase("ausente@escola.com")).thenReturn(Optional.empty());

        passwordResetService.requestReset(new ForgotPasswordRequest(" AUSENTE@escola.com "));

        verify(tokenRepository, never()).save(any());
        verify(mailService, never()).sendPasswordReset(any(), any());
    }

    @Test
    void createsHashedTokenAndSendsRawTokenByEmail() {
        UserEntity user = user();
        when(userRepository.findByEmailIgnoreCase(user.getEmail())).thenReturn(Optional.of(user));
        when(tokenRepository.findFirstByUserIdOrderByCreatedAtDesc(user.getId())).thenReturn(Optional.empty());

        passwordResetService.requestReset(new ForgotPasswordRequest(user.getEmail()));

        ArgumentCaptor<PasswordResetTokenEntity> entityCaptor = ArgumentCaptor.forClass(PasswordResetTokenEntity.class);
        ArgumentCaptor<String> rawTokenCaptor = ArgumentCaptor.forClass(String.class);
        verify(tokenRepository).save(entityCaptor.capture());
        verify(mailService).sendPasswordReset(org.mockito.ArgumentMatchers.eq(user.getEmail()), rawTokenCaptor.capture());
        assertEquals(sha256(rawTokenCaptor.getValue()), entityCaptor.getValue().getTokenHash());
    }

    @Test
    void resetsPasswordAndInvalidatesAllUserTokens() {
        UserEntity user = user();
        String rawToken = "token-seguro";
        PasswordResetTokenEntity token = new PasswordResetTokenEntity(
                user,
                sha256(rawToken),
                Instant.now().plusSeconds(300),
                Instant.now());
        when(tokenRepository.findByTokenHash(sha256(rawToken))).thenReturn(Optional.of(token));
        when(passwordEncoder.matches("senha-nova", "hash-atual")).thenReturn(false);
        when(passwordEncoder.encode("senha-nova")).thenReturn("hash-novo");

        passwordResetService.resetPassword(new ResetPasswordRequest(rawToken, "senha-nova"));

        assertEquals("hash-novo", user.getPasswordHash());
        verify(tokenRepository).deleteByUserId(user.getId());
    }

    @Test
    void rejectsExpiredToken() {
        UserEntity user = user();
        String rawToken = "token-expirado";
        PasswordResetTokenEntity token = new PasswordResetTokenEntity(
                user,
                sha256(rawToken),
                Instant.now().minusSeconds(1),
                Instant.now().minusSeconds(901));
        when(tokenRepository.findByTokenHash(sha256(rawToken))).thenReturn(Optional.of(token));

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> passwordResetService.resetPassword(new ResetPasswordRequest(rawToken, "senha-nova")));

        assertEquals("Este link expirou. Solicite uma nova redefinição de senha.", exception.getMessage());
        assertEquals("hash-atual", user.getPasswordHash());
    }

    private UserEntity user() {
        return new UserEntity("Ana", "ana@escola.com", "hash-atual", UserRole.TEACHER);
    }

    private String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new AssertionError(exception);
        }
    }
}
