package br.com.provas.services;

import java.util.Locale;
import java.util.UUID;
import java.nio.charset.StandardCharsets;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.provas.dtos.auth.AuthResponse;
import br.com.provas.dtos.auth.ChangePasswordRequest;
import br.com.provas.dtos.auth.LoginRequest;
import br.com.provas.dtos.auth.RegisterRequest;
import br.com.provas.dtos.auth.UpdateProfileRequest;
import br.com.provas.dtos.auth.UserProfileResponse;
import br.com.provas.entities.UserEntity;
import br.com.provas.entities.UserRole;
import br.com.provas.exceptions.ConflictException;
import br.com.provas.repositories.UserRepository;
import br.com.provas.repositories.PasswordResetTokenRepository;
import br.com.provas.security.JwtService;

@Service
public class AuthenticationService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final PasswordResetTokenRepository tokenRepository;

    public AuthenticationService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            PasswordResetTokenRepository tokenRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.tokenRepository = tokenRepository;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.email());
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ConflictException("Já existe uma conta cadastrada com este e-mail.");
        }
        validatePasswordByteLength(request.password());

        UserEntity user = new UserEntity(
                normalizeName(request.name()),
                email,
                passwordEncoder.encode(request.password()),
                UserRole.TEACHER);
        try {
            userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException exception) {
            throw new ConflictException("Já existe uma conta cadastrada com este e-mail.");
        }
        return createAuthResponse(user);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        UserEntity user = userRepository.findByEmailIgnoreCase(normalizeEmail(request.email()))
                .orElseThrow(() -> new BadCredentialsException("E-mail ou senha inválidos."));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BadCredentialsException("E-mail ou senha inválidos.");
        }

        return createAuthResponse(user);
    }

    @Transactional
    public AuthResponse loginLocalDemo() {
        UserEntity user = userRepository.findByEmailIgnoreCase("demonstracao@provas.local")
                .orElseGet(() -> userRepository.saveAndFlush(new UserEntity(
                        "Demonstração local",
                        "demonstracao@provas.local",
                        passwordEncoder.encode(UUID.randomUUID().toString()),
                        UserRole.TEACHER)));
        return createAuthResponse(user);
    }

    @Transactional(readOnly = true)
    public UserProfileResponse getProfile(UUID userId) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new BadCredentialsException("Sessão não encontrada."));
        return UserProfileResponse.from(user);
    }

    @Transactional
    public UserProfileResponse updateProfile(UUID userId, UpdateProfileRequest request) {
        UserEntity user = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new BadCredentialsException("Sessão não encontrada."));
        String email = normalizeEmail(request.email());
        userRepository.findByEmailIgnoreCase(email)
                .filter(existingUser -> !existingUser.getId().equals(userId))
                .ifPresent(existingUser -> {
                    throw new ConflictException("Já existe uma conta cadastrada com este e-mail.");
                });
        if (!user.getEmail().equalsIgnoreCase(email)) {
            tokenRepository.deleteByUserId(userId);
        }
        user.updateProfile(normalizeName(request.name()), email);
        return UserProfileResponse.from(user);
    }

    @Transactional
    public void changePassword(UUID userId, ChangePasswordRequest request) {
        UserEntity user = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new BadCredentialsException("Sessão não encontrada."));
        validatePasswordByteLength(request.currentPassword());
        validatePasswordByteLength(request.newPassword());

        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("A senha atual está incorreta.");
        }
        if (passwordEncoder.matches(request.newPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("A nova senha deve ser diferente da senha atual.");
        }

        user.changePassword(passwordEncoder.encode(request.newPassword()));
        tokenRepository.deleteByUserId(userId);
    }

    private AuthResponse createAuthResponse(UserEntity user) {
        JwtService.TokenData tokenData = jwtService.createToken(
                user.getId(), user.getEmail(), user.getRole(), user.getCredentialVersion());
        return new AuthResponse(
                tokenData.token(),
                "Bearer",
                tokenData.expiresAt(),
                UserProfileResponse.from(user));
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeName(String name) {
        return name.trim().replaceAll("\\s+", " ");
    }

    private void validatePasswordByteLength(String password) {
        if (password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new IllegalArgumentException("A senha deve ter no máximo 72 bytes.");
        }
    }
}
