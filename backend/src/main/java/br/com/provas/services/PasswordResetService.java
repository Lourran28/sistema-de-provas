package br.com.provas.services;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Optional;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.provas.dtos.auth.ForgotPasswordRequest;
import br.com.provas.dtos.auth.ResetPasswordRequest;
import br.com.provas.entities.PasswordResetTokenEntity;
import br.com.provas.entities.UserEntity;
import br.com.provas.repositories.PasswordResetTokenRepository;
import br.com.provas.repositories.UserRepository;

@Service
public class PasswordResetService {

    private static final Duration TOKEN_LIFETIME = Duration.ofMinutes(15);
    private static final Duration REQUEST_COOLDOWN = Duration.ofMinutes(1);
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;

    public PasswordResetService(
            UserRepository userRepository,
            PasswordResetTokenRepository tokenRepository,
            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.tokenRepository = tokenRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public Optional<ResetDelivery> requestReset(ForgotPasswordRequest request) {
        return userRepository.findByEmailForUpdate(normalizeEmail(request.email()))
                .flatMap(this::createToken);
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        String hash = hashToken(request.token());
        var userId = tokenRepository.findUserIdByTokenHash(hash)
                .orElseThrow(() -> new IllegalArgumentException("Este link é inválido ou já foi utilizado."));
        // All credential changes lock the user first, then re-read the token after waiting.
        UserEntity user = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new IllegalArgumentException("Este link é inválido ou já foi utilizado."));
        PasswordResetTokenEntity resetToken = tokenRepository.findByTokenHash(hash)
                .orElseThrow(() -> new IllegalArgumentException("Este link é inválido ou já foi utilizado."));

        if (!resetToken.getExpiresAt().isAfter(Instant.now())) {
            throw new IllegalArgumentException("Este link expirou. Solicite uma nova redefinição de senha.");
        }

        validatePasswordByteLength(request.newPassword());
        if (passwordEncoder.matches(request.newPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("A nova senha deve ser diferente da senha anterior.");
        }

        user.changePassword(passwordEncoder.encode(request.newPassword()));
        tokenRepository.deleteByUserId(user.getId());
    }

    private Optional<ResetDelivery> createToken(UserEntity user) {
        Instant now = Instant.now();
        boolean requestedRecently = tokenRepository.findFirstByUserIdOrderByCreatedAtDesc(user.getId())
                .map(token -> token.getCreatedAt().isAfter(now.minus(REQUEST_COOLDOWN)))
                .orElse(false);
        if (requestedRecently) {
            return Optional.empty();
        }

        String rawToken = generateToken();
        tokenRepository.deleteByUserId(user.getId());
        tokenRepository.save(new PasswordResetTokenEntity(
                user,
                hashToken(rawToken),
                now.plus(TOKEN_LIFETIME),
                now));
        return Optional.of(new ResetDelivery(user.getEmail(), rawToken));
    }

    public record ResetDelivery(String recipient, String token) {
        @Override
        public String toString() {
            return "ResetDelivery[redacted]";
        }
    }

    private String generateToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hashToken(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("Não foi possível validar o link de redefinição.", exception);
        }
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private void validatePasswordByteLength(String password) {
        if (password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new IllegalArgumentException("A senha deve ter no máximo 72 bytes.");
        }
    }
}
